'use strict';

/**
 * Dispatcher — the daemon's main loop.
 * Responsibilities:
 *   - Claim pending jobs atomically (semaphore + SQL)
 *   - Launch Workers
 *   - Handle rate-limit results: waiting_rate_limit vs countdown
 *   - Retry failed_attempt jobs with backoff
 *   - Rescue orphaned jobs on startup
 *   - Heartbeat to daemon_heartbeat table
 *   - Hot-reload patterns via SIGUSR1
 *   - billing_block: pause all claims until human intervention
 */

const os   = require('node:os');
const path = require('node:path');
const fs   = require('node:fs');

const { openDb }              = require('../lib/db');
const { loadPatterns, reloadPatterns, calcBackoff } = require('../lib/rate-limit');
const { resolveModel }        = require('../lib/cost');
const { resolveSprintStatusPath, checkDependencies } = require('../lib/dependencies');
const { markAbandoned }       = require('../lib/sessions');
const { runWorker }           = require('./worker');
const { WakeLock }            = require('../lib/wake-lock');
const { createLogger, currentLogPath } = require('../lib/logger');
const { TelemetryBridge }             = require('../lib/telemetry-bridge');

// ─── Configuration ────────────────────────────────────────────────────────────

const QUEUE_HOME          = process.env.SIESA_QUEUE_HOME || path.join(os.homedir(), '.siesa-queue');
const DB_PATH             = path.join(QUEUE_HOME, 'queue.db');
const PATTERNS_PATH       = path.join(__dirname, '../config/rate-limit-patterns.json');
const MODEL_POLICY_PATH   = path.join(QUEUE_HOME, 'model-policy.json');
const MODEL_POLICY_BUNDLED = path.join(__dirname, '../config/model-policy.json');
// AC #1: TICK_MS default 5000 ms; AC #8: MAX_CONCURRENCY default 1 (can be overridden by daemon_config)
const MAX_CONCURRENCY_ENV = parseInt(process.env.SIESA_QUEUE_CONCURRENCY || process.env.SIESA_QUEUE_MAX_CONCURRENCY || '1', 10);
const TICK_MS             = parseInt(process.env.SIESA_QUEUE_TICK_MS          || '5000', 10);
const HEARTBEAT_MS        = parseInt(process.env.SIESA_QUEUE_HEARTBEAT_MS     || '30000', 10);
const CLAUDE_BIN          = process.env.SIESA_CLAUDE_BIN || null; // null → worker resolves via PATH
const VERSION             = process.env.npm_package_version || '0.0.0';
// Check budget and sync paused state every N ticks (story 1.5)
const BUDGET_CHECK_EVERY_N_TICKS = 6;

// Sessions GC: run once per day (AC #9)
const SESSION_GC_DEFAULT_OLDER_THAN_S = 30 * 86400; // 30 days

// ─── State ────────────────────────────────────────────────────────────────────

let db;
let patterns        = [];
let policy          = null;  // Loaded model-policy.json
let inFlight        = 0;
let billingBlocked  = false;
let shuttingDown    = false;
let lastGcEpoch     = 0;     // Epoch ms of last sessions GC run (AC #9)
let paused          = false; // budget auto-pause or manual pause (story 1.5)
let pausedByBudget  = false; // true only when paused was triggered by budget check
let lastDay         = '';    // YYYY-MM-DD; used to detect day rollover for auto-resume
let bridge          = null;  // TelemetryBridge instance (story 1.5)
let budgetTick      = 0;     // incremented each tick; budget check runs every N ticks
let maxConcurrency  = Number.isFinite(MAX_CONCURRENCY_ENV) && MAX_CONCURRENCY_ENV >= 1
  ? MAX_CONCURRENCY_ENV : 1; // hot-reloadable concurrency limit (story 1.6)
const startedAt     = Math.floor(Date.now() / 1000);
const wakeLock      = new WakeLock();

/**
 * @returns {number} current epoch seconds
 */
function nowSec() {
  return Math.floor(Date.now() / 1000);
}

// ─── Paused state (story 1.5) ─────────────────────────────────────────────────

/**
 * Update in-memory paused state and persist to daemon_config.
 * @param {boolean} newPaused
 * @param {'budget'|'budget_reset'|'manual'} reason
 */
function setPaused(newPaused, reason) {
  paused         = newPaused;
  pausedByBudget = newPaused && reason === 'budget';
  try {
    db.prepare(`UPDATE daemon_config SET paused=?, paused_by_budget=?, updated_at=? WHERE id=1`)
      .run(newPaused ? 1 : 0, pausedByBudget ? 1 : 0, nowSec());
  } catch { /* non-fatal: daemon_config may not exist on older DBs */ }
  log('info', 'dispatcher.paused_changed', { paused: newPaused, reason, paused_by_budget: pausedByBudget });
}

/**
 * Re-read paused state from DB to pick up manual CLI changes between ticks.
 */
function syncPausedFromDb() {
  try {
    const cfg = db.prepare('SELECT paused, paused_by_budget FROM daemon_config WHERE id=1').get();
    if (!cfg) return;
    const dbPaused = Boolean(cfg.paused);
    if (dbPaused !== paused) {
      paused         = dbPaused;
      pausedByBudget = Boolean(cfg.paused_by_budget);
      log('info', 'dispatcher.paused_reloaded', { paused, paused_by_budget: pausedByBudget });
    }
  } catch { /* non-fatal */ }
}

/**
 * Re-read concurrency from DB to pick up hot changes from `queue config set concurrency N`.
 * Task 2 (story 1.6): daemon detects concurrency changes on next tick.
 */
function syncConcurrencyFromDb() {
  try {
    const cfg = db.prepare('SELECT concurrency FROM daemon_config WHERE id=1').get();
    if (!cfg || cfg.concurrency == null) return;
    const n = cfg.concurrency;
    if (Number.isInteger(n) && n >= 1 && n !== maxConcurrency) {
      log('info', 'dispatcher.concurrency_reloaded', { prev: maxConcurrency, next: n });
      maxConcurrency = n;
    }
  } catch { /* non-fatal: column may not exist on old DBs */ }
}

/**
 * Check daily budget against cost_ledger. Auto-pause if limit exceeded.
 */
function checkBudget() {
  if (!policy || policy.daily_budget_usd == null) return;
  if (paused) return; // already paused; no need to check
  try {
    const row = db.prepare(`
      SELECT COALESCE(SUM(cost_usd), 0) AS total FROM cost_ledger
      WHERE date(ts, 'unixepoch') = date('now')
    `).get();
    if (row && row.total >= policy.daily_budget_usd) {
      setPaused(true, 'budget');
      // AC #6: emit status.changed --from running --to paused with severity=ERROR via Bridge (story 1.6)
      bridge && bridge.emitStatusChanged('running', 'paused', {
        reason:      'budget_exceeded',
        daily_spent: row.total,
        limit:       policy.daily_budget_usd,
        severity:    'ERROR',
      });
      log('error', 'budget.exceeded', { daily_spent: row.total, limit: policy.daily_budget_usd });
    }
  } catch (err) {
    log('warn', 'budget_check_error', { message: err.message });
  }
}

/**
 * Detect UTC day rollover. Auto-resume if paused by budget and new day spend is zero.
 */
function checkDayChange() {
  const today = new Date().toISOString().slice(0, 10);
  if (today === lastDay) return;
  lastDay = today;

  if (!paused || !pausedByBudget) return;
  try {
    const row = db.prepare(`
      SELECT COALESCE(SUM(cost_usd), 0) AS total FROM cost_ledger
      WHERE date(ts, 'unixepoch') = date('now')
    `).get();
    if (row && row.total === 0) {
      setPaused(false, 'budget_reset');
      // AC #7: emit status.changed --from paused --to running via Bridge (story 1.6)
      bridge && bridge.emitStatusChanged('paused', 'running', { reason: 'budget_reset', day: today });
      log('info', 'budget.auto_resumed', { day: today });
    }
  } catch (err) {
    log('warn', 'day_change_check_error', { message: err.message });
  }
}

// ─── Heartbeat ────────────────────────────────────────────────────────────────

function heartbeat() {
  try {
    db.prepare(`
      INSERT OR REPLACE INTO daemon_heartbeat (id, pid, host, started_at, last_beat_ts, in_flight, version)
      VALUES (1, ?, ?, ?, ?, ?, ?)
    `).run(process.pid, os.hostname(), startedAt, nowSec(), inFlight, VERSION);
  } catch {
    // Non-fatal: DB may be temporarily locked
  }
}

// ─── Orphan rescue ───────────────────────────────────────────────────────────

/**
 * On startup: find jobs in claimed/running state that have no active process.
 * Mark their runs as errored, increment attempts, move job to pending with delay.
 */
function rescueOrphans() {
  const orphans = db.prepare(`
    SELECT id, attempts, max_retries FROM jobs
    WHERE state IN ('claimed', 'running')
  `).all();

  for (const job of orphans) {
    const now = nowSec();

    // Close any open run records
    db.prepare(`
      UPDATE runs
      SET finished_at = ?, is_error = 1, rate_limited = 0
      WHERE job_id = ? AND finished_at IS NULL
    `).run(now, job.id);

    const newAttempts = job.attempts + 1;

    if (newAttempts >= job.max_retries) {
      db.prepare(`
        UPDATE jobs
        SET state = 'failed', attempts = ?, last_error = 'daemon_restart', updated_at = ?
        WHERE id = ?
      `).run(newAttempts, now, job.id);
    } else {
      db.prepare(`
        UPDATE jobs
        SET state = 'pending', attempts = ?, last_error = 'daemon_restart',
            not_before_ts = ?, updated_at = ?
        WHERE id = ?
      `).run(newAttempts, now + 5, now, job.id);
    }

    insertEvent(job.id, null, 'warn', 'orphan_rescued', {
      previous_state: 'claimed/running',
      new_attempts:   newAttempts,
    });
  }

  if (orphans.length > 0) {
    log('info', 'orphans_rescued', { count: orphans.length });
  }
}

// ─── Pending rate-limited jobs ────────────────────────────────────────────────

/**
 * Each tick: promote jobs from waiting_rate_limit whose not_before_ts has passed.
 */
function promoteRateLimitedJobs() {
  const now   = nowSec();
  const ready = db.prepare(`
    SELECT id FROM jobs
    WHERE state = 'waiting_rate_limit' AND not_before_ts <= ?
  `).all(now);

  for (const job of ready) {
    db.prepare(`
      UPDATE jobs SET state = 'pending', updated_at = ? WHERE id = ?
    `).run(now, job.id);

    db.prepare(`
      UPDATE rate_limit_windows
      SET closed_at = ?
      WHERE job_id = ? AND closed_at IS NULL
    `).run(now, job.id);

    insertEvent(job.id, null, 'info', 'rate_limit_window_closed', { promoted_at: now });
  }
}

// ─── Failed-attempt backoff ───────────────────────────────────────────────────

/**
 * Each tick: re-queue failed_attempt jobs with exponential backoff.
 * Jobs that have exhausted max_retries are moved to terminal 'failed'.
 */
function processFailedAttempts() {
  const jobs = db.prepare(`
    SELECT id, attempts, max_retries, last_error FROM jobs
    WHERE state = 'failed_attempt'
  `).all();

  const now = nowSec();

  for (const job of jobs) {
    if (job.attempts >= job.max_retries) {
      db.prepare(`
        UPDATE jobs SET state = 'failed', updated_at = ? WHERE id = ?
      `).run(now, job.id);
      insertEvent(job.id, null, 'error', 'max_retries_exceeded', { attempts: job.attempts });
    } else {
      const backoff = calcBackoff(job.attempts);
      db.prepare(`
        UPDATE jobs SET state = 'pending', not_before_ts = ?, updated_at = ? WHERE id = ?
      `).run(now + backoff, now, job.id);
      insertEvent(job.id, null, 'info', 'retry_scheduled', { backoff_s: backoff, attempts: job.attempts });
    }
  }
}

// ─── Job claim ────────────────────────────────────────────────────────────────

/**
 * Atomically claim the next eligible pending job whose epic dependencies are met.
 * Iterates candidates in priority/id order; skips any whose depends_on_epics are
 * not yet satisfied in sprint-status.yaml.
 * @returns {object|null} claimed job row or null
 */
function claimNextJob() {
  const now = nowSec();

  // Read epic statuses once outside the transaction to avoid repeated FS reads.
  let epicStatuses = null;
  const sprintPath = resolveSprintStatusPath();
  if (sprintPath) {
    try { epicStatuses = getEpicStatuses(sprintPath); } catch { /* file unreadable; deps unmet */ }
  }

  return db.transaction(() => {
    const candidates = db.prepare(`
      SELECT id, type, state, priority, correlation_key, payload_json,
             model_override, max_retries, attempts
      FROM jobs
      WHERE state = 'pending'
        AND not_before_ts <= ?
        AND (
          correlation_key IS NULL
          OR correlation_key NOT IN (
            SELECT correlation_key FROM jobs
            WHERE state IN ('claimed', 'running') AND correlation_key IS NOT NULL
          )
        )
      ORDER BY priority ASC, id ASC
      LIMIT 50
    `).all(now);

    for (const job of candidates) {
      const { ok, unmet } = checkDependencies(job, epicStatuses);
      if (!ok) {
        insertEvent(job.id, null, 'info', 'dependency_unmet', { depends_on_epics: unmet });
        continue;
      }

      db.prepare(`
        UPDATE jobs SET state = 'claimed', updated_at = ? WHERE id = ?
      `).run(now, job.id);

      return job;
    }

    return null;
  })();
}

// ─── Session resolution ──────────────────────────────────────────────────────

const { resolveSessionId } = require('../lib/sessions');

// ─── Rate-limit result handling ──────────────────────────────────────────────

/**
 * Handle Worker result for a rate-limited job.
 * Short-wait: re-queue as pending immediately (countdown already done in Worker).
 * Long-wait: insert rate_limit_window, move to waiting_rate_limit.
 * billing_block: pause daemon.
 * @param {object} job
 * @param {object} result - WorkerResult
 */
function handleRateLimitResult(job, result) {
  const now = nowSec();

  if (result.category === 'billing_block') {
    billingBlocked = true;
    log('error', 'billing_block.detected', {
      job_id:     job.id,
      pattern_id: result.patternId,
      reset_ts:   result.resetTs,
    });
    // Move job to waiting_rate_limit; billing block requires human intervention
    db.prepare(`
      INSERT INTO rate_limit_windows (detected_at, reset_ts, source, pattern_matched, raw_excerpt, job_id)
      VALUES (?, ?, 'billing_block', ?, ?, ?)
    `).run(now, result.resetTs, result.patternId, result.rawExcerpt, job.id);

    db.prepare(`
      UPDATE jobs SET state = 'waiting_rate_limit', not_before_ts = ?, updated_at = ? WHERE id = ?
    `).run(result.resetTs, now, job.id);
    return;
  }

  if (result.shortWait) {
    // Countdown already completed in Worker; re-queue as pending
    db.prepare(`
      UPDATE jobs SET state = 'pending', not_before_ts = 0, updated_at = ?, last_error = 'rate_limit_short_wait'
      WHERE id = ?
    `).run(now, job.id);
    insertEvent(job.id, null, 'info', 'rate_limit_short_wait_done', { reset_ts: result.resetTs });
    return;
  }

  // Long wait: insert window record and move to waiting_rate_limit
  const source = result.patternId ? 'regex_match' : 'rate_limit_event';

  // Check if rate_limit_windows has a job_id column (schema may or may not have it)
  // We insert with optional job_id — schema has it based on our plan
  try {
    db.prepare(`
      INSERT INTO rate_limit_windows (detected_at, reset_ts, source, pattern_matched, raw_excerpt, job_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(now, result.resetTs, source, result.patternId, result.rawExcerpt, job.id);
  } catch {
    // Fallback: schema without job_id column
    db.prepare(`
      INSERT INTO rate_limit_windows (detected_at, reset_ts, source, pattern_matched, raw_excerpt)
      VALUES (?, ?, ?, ?, ?)
    `).run(now, result.resetTs, source, result.patternId, result.rawExcerpt);
  }

  db.prepare(`
    UPDATE jobs
    SET state = 'waiting_rate_limit', not_before_ts = ?, updated_at = ?, last_error = 'rate_limit'
    WHERE id = ?
  `).run(result.resetTs, now, job.id);

  insertEvent(job.id, null, 'warn', 'rate_limit_wait_long', {
    reset_ts:   result.resetTs,
    category:   result.category,
    pattern_id: result.patternId,
  });
}

// ─── Main tick ────────────────────────────────────────────────────────────────

async function tick() {
  if (shuttingDown) return;

  // Sessions GC: once per day (AC #9)
  if (Date.now() - lastGcEpoch > 86400000) {
    try {
      const count = markAbandoned(db, SESSION_GC_DEFAULT_OLDER_THAN_S);
      if (count > 0) {
        log('info', 'sessions_gc', { abandoned_count: count, older_than_s: SESSION_GC_DEFAULT_OLDER_THAN_S });
      }
    } catch (err) {
      log('warn', 'sessions_gc_error', { message: err.message });
    }
    lastGcEpoch = Date.now();
  }

  // Day change + periodic budget, paused-state, and concurrency sync (story 1.5/1.6)
  checkDayChange();
  budgetTick++;
  if (budgetTick % BUDGET_CHECK_EVERY_N_TICKS === 0) {
    syncPausedFromDb();
    syncConcurrencyFromDb();
    checkBudget();
  }

  // Promote rate-limited jobs that are ready
  promoteRateLimitedJobs();

  // Process failed_attempt backoff
  processFailedAttempts();

  // Do not claim new jobs if billing blocked, paused, or at capacity
  if (billingBlocked || paused || inFlight >= maxConcurrency) return;

  const job = claimNextJob();
  if (!job) return;

  inFlight++;
  // Acquire wake-lock when the first job becomes active (inFlight: 0 → 1)
  if (inFlight === 1) {
    wakeLock.acquire(process.pid);
  }

  const { sessionId, isNew: sessionIsNew } = resolveSessionId(job, db);
  const effectiveModel = resolveModel(job, policy);
  const now            = nowSec();

  // AC #11: persist raw_log_path in runs record (updated after run insert in worker)
  const rawLogPath = currentLogPath();

  db.prepare(`
    UPDATE jobs SET state = 'running', updated_at = ? WHERE id = ?
  `).run(now, job.id);

  // Emit job.start before spawning worker (story 1.5)
  bridge && bridge.emit('job.start', job, sessionId);

  // Run worker (non-blocking)
  // sessionIsNew=true → pass --session-id (start fresh with that UUID)
  // sessionIsNew=false → pass --resume (continue existing conversation)
  runWorker({ db, job, patterns, sessionId, sessionIsNew, claudeBin: CLAUDE_BIN, effectiveModel, policy, rawLogPath })
    .then((result) => {
      inFlight--;
      // Release wake-lock when last in-flight job completes (inFlight: 1 → 0)
      if (inFlight === 0) {
        wakeLock.release();
      }
      const n = nowSec();

      if (result.rateLimited) {
        // Emit rate_limit.detected only for long-wait (story 1.5)
        if (!result.shortWait) {
          bridge && bridge.emit('rate_limit.detected', job, sessionId);
        }
        handleRateLimitResult(job, result);
        return;
      }

      if (result.isError) {
        // Move to failed_attempt; processFailedAttempts will handle backoff next tick
        db.prepare(`
          UPDATE jobs
          SET state = 'failed_attempt', attempts = attempts + 1,
              last_error = ?, updated_at = ?
          WHERE id = ?
        `).run(`exit_code:${result.exitCode}`, n, job.id);
      } else {
        db.prepare(`
          UPDATE jobs SET state = 'succeeded', updated_at = ? WHERE id = ?
        `).run(n, job.id);
        bridge && bridge.emit('job.finish', job, sessionId);
      }
    })
    .catch((err) => {
      inFlight--;
      // Release wake-lock on unexpected worker error too
      if (inFlight === 0) {
        wakeLock.release();
      }
      const n = nowSec();
      db.prepare(`
        UPDATE jobs
        SET state = 'failed_attempt', attempts = attempts + 1,
            last_error = ?, updated_at = ?
        WHERE id = ?
      `).run(`worker_error:${err.message}`, n, job.id);
      log('error', 'worker_exception', { job_id: job.id, message: err.message });
    });
}

// ─── Logging ──────────────────────────────────────────────────────────────────

// AC #11: logger initialized; verbose flag from env (set by CLI before requiring dispatcher)
const verbose = (process.env.SIESA_QUEUE_LOG_LEVEL || '').toLowerCase() === 'debug';
const winstonLogger = createLogger({ verbose });

function log(level, event, payload) {
  const meta = { event, ...(payload || {}) };
  // Winston maps debug/info/warn/error
  const fn = ['debug', 'info', 'warn', 'error'].includes(level) ? level : 'info';
  winstonLogger[fn](event, meta);
}

function insertEvent(jobId, runId, level, event, payload) {
  try {
    db.prepare(`
      INSERT INTO events (run_id, job_id, ts, level, event, payload)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(runId, jobId, nowSec(), level, event, payload ? JSON.stringify(payload) : null);
  } catch {
    // Non-fatal
  }
}

// ─── Hot-reload patterns ──────────────────────────────────────────────────────

function onReloadPatterns() {
  try {
    patterns = reloadPatterns(PATTERNS_PATH);
    log('info', 'patterns_reloaded', { count: patterns.length, path: PATTERNS_PATH });
  } catch (err) {
    log('error', 'patterns_reload_failed', { message: err.message });
  }
}

// ─── Startup ──────────────────────────────────────────────────────────────────

/**
 * Load model-policy.json from QUEUE_HOME, falling back to the bundled config.
 */
function loadPolicy() {
  const paths = [MODEL_POLICY_PATH, MODEL_POLICY_BUNDLED];
  for (const p of paths) {
    try {
      const raw = fs.readFileSync(p, 'utf8');
      return JSON.parse(raw);
    } catch {
      // try next
    }
  }
  log('warn', 'policy_load_failed', { tried: paths });
  return null;
}

function start() {
  db = openDb(DB_PATH);

  // Load persisted paused state and concurrency (story 1.5/1.6)
  try {
    const cfg = db.prepare('SELECT paused, paused_by_budget, concurrency FROM daemon_config WHERE id=1').get();
    if (cfg) {
      paused         = Boolean(cfg.paused);
      pausedByBudget = Boolean(cfg.paused_by_budget);
      // story 1.6: concurrency from DB takes precedence over env var if set
      if (cfg.concurrency != null && Number.isInteger(cfg.concurrency) && cfg.concurrency >= 1) {
        maxConcurrency = cfg.concurrency;
      }
    }
  } catch { /* daemon_config may not exist on very old DBs; migration will handle it */ }

  // Initialize telemetry bridge (story 1.5)
  bridge  = new TelemetryBridge({ logger: winstonLogger });
  // Initialize day tracker for midnight auto-resume (story 1.5 AC #10)
  lastDay = new Date().toISOString().slice(0, 10);

  try {
    patterns = loadPatterns(PATTERNS_PATH);
  } catch (err) {
    log('warn', 'patterns_load_failed', { message: err.message, path: PATTERNS_PATH });
    patterns = [];
  }

  policy = loadPolicy();

  log('info', 'dispatcher.started', {
    pid:            process.pid,
    concurrency:    maxConcurrency,
    tick_ms:        TICK_MS,
    heartbeat_ms:   HEARTBEAT_MS,
    patterns_count: patterns.length,
    policy_version: policy ? policy.version : null,
    paused,
    paused_by_budget: pausedByBudget,
  });

  // Rescue orphans before processing new jobs
  rescueOrphans();

  // Initial budget check on startup (story 1.5)
  checkBudget();

  // Heartbeat
  heartbeat();
  setInterval(heartbeat, HEARTBEAT_MS);

  // Main tick loop
  setInterval(async () => {
    try {
      await tick();
    } catch (err) {
      log('error', 'tick_error', { message: err.message });
    }
  }, TICK_MS);

  // SIGUSR1: hot-reload patterns (Linux/macOS)
  process.on('SIGUSR1', onReloadPatterns);

  // Graceful shutdown per AC #9:
  //   - Complete tick in progress
  //   - Wait up to 5 s for active worker
  //   - Persist job as pending if not completed
  //   - Exit with code 0
  function gracefulShutdown(signal) {
    if (shuttingDown) return; // idempotent
    shuttingDown = true;
    log('info', 'dispatcher.stopping', { signal, in_flight: inFlight });
    wakeLock.release();

    // If no workers in flight, close and exit immediately
    if (inFlight === 0) {
      try { db.close(); } catch { /* non-fatal */ }
      process.exit(0);
      return;
    }

    // Wait up to 5 s for in-flight workers to finish
    const GRACEFUL_WAIT_MS = 5_000;
    const deadline = Date.now() + GRACEFUL_WAIT_MS;

    const pollInterval = setInterval(() => {
      if (inFlight === 0 || Date.now() >= deadline) {
        clearInterval(pollInterval);

        if (inFlight > 0) {
          // AC #9: persist claimed/running jobs back to pending
          log('warn', 'dispatcher.force_stop', { in_flight: inFlight, reason: 'timeout_5s' });
          try {
            const now = Math.floor(Date.now() / 1000);
            db.prepare(`
              UPDATE jobs SET state='pending', not_before_ts=?, updated_at=?
              WHERE state IN ('claimed', 'running')
            `).run(now, now);
          } catch (e) {
            log('error', 'dispatcher.revert_error', { message: e.message });
          }
        }

        try { db.close(); } catch { /* non-fatal */ }
        process.exit(0);
      }
    }, 200);
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
}

start();
