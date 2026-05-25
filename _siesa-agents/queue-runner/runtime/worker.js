'use strict';

/**
 * Worker — executes a single job attempt by spawning `claude --print` and processing
 * its NDJSON stream. Handles rate-limit detection (multi-source), countdown
 * in-process for short waits, and resolves with structured result for the Dispatcher.
 *
 * AC #3: argv includes --print, --dangerously-skip-permissions, --verbose,
 *        --output-format stream-json, --model <model>, prompt
 * AC #4: CLAUDECODE env var deleted from spawn env (nested invocation support)
 * AC #5: events stream.tool_use, stream.text_delta, job.claim, job.finish
 * AC #12: prompt built via prompt-builder.js
 */

const { spawn }  = require('node:child_process');
const fs         = require('node:fs');
const path       = require('node:path');

const { detectRateLimit, extractResetTs } = require('../lib/rate-limit');
const { calcCost, recordCost }            = require('../lib/cost');
const { buildPrompt }                     = require('../lib/prompt-builder');

/**
 * @typedef {Object} WorkerResult
 * @property {boolean} isError
 * @property {boolean} rateLimited
 * @property {number|null} resetTs      - epoch seconds; set when rateLimited=true
 * @property {string|null} category     - rate-limit category when rateLimited
 * @property {string|null} patternId    - matched pattern id
 * @property {string|null} rawExcerpt
 * @property {string|null} resultText   - Claude result text (truncated)
 * @property {number|null} exitCode
 * @property {number}      durationMs
 */

const COUNTDOWN_THRESHOLD_S = 600; // short wait ≤ 600 s → in-process countdown

// ─── Claude binary resolution (Dev Notes / bmad_orchestrator.py:454-467) ────────

/**
 * Resolve the claude CLI binary path.
 * Search order: SIESA_CLAUDE_BIN env → claude/claude.cmd in PATH → npx claude fallback.
 * @returns {{ bin: string, args: string[] }} bin = executable, args = prefix args
 */
function resolveClaudeBin() {
  // 1. Explicit env override
  if (process.env.SIESA_CLAUDE_BIN) {
    return { bin: process.env.SIESA_CLAUDE_BIN, args: [] };
  }

  // 2. Search PATH for claude or claude.cmd
  const pathDirs = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  const candidates = process.platform === 'win32'
    ? ['claude.cmd', 'claude.exe', 'claude']
    : ['claude'];

  for (const dir of pathDirs) {
    for (const name of candidates) {
      const full = path.join(dir, name);
      try {
        fs.accessSync(full, fs.constants.X_OK);
        return { bin: full, args: [] };
      } catch {
        // not found in this dir
      }
    }
  }

  // 3. Fallback: npx claude
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  return { bin: npx, args: ['claude'] };
}
const COUNTDOWN_POLL_MS     = 5_000;
const COUNTDOWN_LOG_EVERY   = 30;   // log every 30 s (in increments of poll interval)

/**
 * Sleep for ms milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Insert a structured event into the DB (fire-and-forget, sync).
 * @param {import('better-sqlite3').Database} db
 * @param {number} jobId
 * @param {number|null} runId
 * @param {string} level
 * @param {string} event
 * @param {object|null} payload
 */
function insertEvent(db, jobId, runId, level, event, payload) {
  const now = Math.floor(Date.now() / 1000);
  db.prepare(`
    INSERT INTO events (run_id, job_id, ts, level, event, payload)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(runId, jobId, now, level, event, payload ? JSON.stringify(payload) : null);
}

/**
 * Run the in-process countdown loop (short wait ≤ 600 s).
 * Logs rate_limit_countdown event every 30 s.
 * @param {import('better-sqlite3').Database} db
 * @param {number} jobId
 * @param {number|null} runId
 * @param {number} resetTs - epoch seconds
 * @returns {Promise<void>}
 */
async function runCountdown(db, jobId, runId, resetTs) {
  let elapsed = 0;
  while (true) {
    const nowSec = Math.floor(Date.now() / 1000);
    const remaining = resetTs - nowSec;
    if (remaining <= 0) break;

    await sleep(COUNTDOWN_POLL_MS);
    elapsed += COUNTDOWN_POLL_MS / 1000;

    if (elapsed % COUNTDOWN_LOG_EVERY < (COUNTDOWN_POLL_MS / 1000) + 0.5) {
      const remaining2 = resetTs - Math.floor(Date.now() / 1000);
      insertEvent(db, jobId, runId, 'info', 'rate_limit_countdown', {
        wait_remaining_s: remaining2,
        reset_ts: resetTs,
      });
    }
  }
}

/**
 * Run a single job attempt.
 *
 * @param {object} opts
 * @param {import('better-sqlite3').Database} opts.db
 * @param {object} opts.job             - Row from jobs table
 * @param {Array}  opts.patterns        - Compiled rate-limit patterns
 * @param {string} opts.sessionId       - UUID for session management
 * @param {boolean} [opts.sessionIsNew] - true → use --session-id (new session); false → use --resume
 * @param {string} [opts.claudeBin]     - Path or command for claude CLI (null = resolve via PATH)
 * @param {string} opts.effectiveModel  - Resolved model name (from resolveModel)
 * @param {object} opts.policy          - Loaded model-policy.json object
 * @param {string} [opts.rawLogPath]    - Current log file path (persisted in runs.raw_log_path)
 * @returns {Promise<WorkerResult>}
 */
async function runWorker({ db, job, patterns, sessionId, sessionIsNew = true, claudeBin, effectiveModel, policy, rawLogPath }) {
  const startTs  = Date.now();
  const nowSec   = () => Math.floor(Date.now() / 1000);

  // Parse payload
  let payload;
  try {
    payload = JSON.parse(job.payload_json);
  } catch {
    payload = {};
  }

  // Create run record — persist model_used and raw_log_path before spawn (AC #7, #11)
  const runStmt = db.prepare(`
    INSERT INTO runs (job_id, attempt_number, session_id, model_used, pid, started_at, is_error, rate_limited, raw_log_path)
    VALUES (?, ?, ?, ?, 0, ?, 0, 0, ?)
  `);
  const runResult = runStmt.run(job.id, job.attempts + 1, sessionId, effectiveModel || null, nowSec(), rawLogPath || null);
  const runId     = runResult.lastInsertRowid;

  // Emit job.claim event (AC #5)
  insertEvent(db, job.id, runId, 'info', 'job.claim', {
    session_id:     sessionId,
    payload_type:   payload.type,
    model:          effectiveModel,
    attempt_number: job.attempts + 1,
  });

  // Build argv per AC #3:
  // --print, --dangerously-skip-permissions, --verbose, --output-format stream-json,
  // --model <model>, <prompt>
  // Determine whether to use --dangerously-skip-permissions (not for unsafe-unset custom jobs)
  const isCustomUnsafe = payload.type === 'custom' && payload.unsafe === true;
  const isNonCustom    = payload.type !== 'custom';
  const useSkipPerms   = isNonCustom || isCustomUnsafe;

  // Resolve prompt and extra args via prompt-builder
  let promptStr;
  let extraArgs = [];
  try {
    const built = buildPrompt(job);
    promptStr  = built.prompt;
    extraArgs  = built.extraArgs || [];
  } catch (err) {
    // Unresolvable prompt — fail job immediately
    const durationMs = Date.now() - startTs;
    const finishedAt = nowSec();
    db.prepare(`
      UPDATE runs SET finished_at=?, duration_ms=?, is_error=1, exit_code=-1, result_text=? WHERE id=?
    `).run(finishedAt, durationMs, err.message, runId);
    insertEvent(db, job.id, runId, 'error', 'prompt_build_error', { message: err.message });
    return Promise.resolve({
      isError:     true,
      rateLimited: false,
      resetTs:    null,
      category:   null,
      patternId:  null,
      rawExcerpt: null,
      resultText: err.message,
      exitCode:   -1,
      durationMs,
    });
  }

  // Resolve claude binary (Dev Notes / AC #3)
  const { bin: claudeBinResolved, args: binPrefixArgs } = resolveClaudeBin();
  const effectiveBin = claudeBin || claudeBinResolved;

  const claudeArgs = [
    ...binPrefixArgs,
    '--print',
    '--output-format', 'stream-json',
    '--verbose',
  ];

  if (useSkipPerms) {
    claudeArgs.push('--dangerously-skip-permissions');
  } else {
    // Custom job without unsafe=true: add warning note but do not add --dangerously-skip-permissions
    insertEvent(db, job.id, runId, 'warn', 'custom_job_no_skip_perms', {
      message: 'Custom job without payload.unsafe=true: --dangerously-skip-permissions omitted (strategy §14)',
    });
  }

  if (sessionId) {
    if (sessionIsNew) {
      // New session: assign the pre-generated UUID so subsequent jobs can --resume it
      claudeArgs.push('--session-id', sessionId);
    } else {
      // Existing session: resume conversation context (avoids "already in use" error)
      claudeArgs.push('--resume', sessionId);
    }
  }

  if (effectiveModel) {
    claudeArgs.push('--model', effectiveModel);
  }

  // Append any extra args from prompt-builder (e.g. --allowedTools)
  if (extraArgs.length > 0) {
    claudeArgs.push(...extraArgs);
  }

  claudeArgs.push(promptStr);

  // Rate-limit state
  let rateLimitDetected = false;
  let rateLimitMatch    = null;
  let rateLimitEvent    = null;
  let resultText        = null;
  let resultUsage       = null; // usage field from the result event (AC #5)

  // API retry heuristic state
  const apiRetryTimestamps = [];

  return new Promise((resolve) => {
    let proc;

    try {
      // AC #4: delete CLAUDECODE from env to allow nested invocation
      // (pattern from bmad_orchestrator.py:484)
      const spawnEnv = { ...process.env };
      delete spawnEnv.CLAUDECODE;

      proc = spawn(effectiveBin, claudeArgs, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env:   spawnEnv,
        cwd:   process.env.SIESA_PROJECT_ROOT || process.cwd(),
      });
    } catch (err) {
      resolve({
        isError:    true,
        rateLimited: false,
        resetTs:    null,
        category:   null,
        patternId:  null,
        rawExcerpt: null,
        resultText: null,
        exitCode:   -1,
        durationMs: Date.now() - startTs,
      });
      return;
    }

    // Update run with PID
    db.prepare('UPDATE runs SET pid=? WHERE id=?').run(proc.pid, runId);

    let stdoutBuf = '';
    let stderrBuf = '';

    // ── STDOUT: NDJSON stream from claude ────────────────────────────────────
    proc.stdout.on('data', (chunk) => {
      stdoutBuf += chunk.toString();
      const lines = stdoutBuf.split('\n');
      stdoutBuf = lines.pop(); // keep incomplete line

      for (const line of lines) {
        if (!line.trim()) continue;
        processClaudeLine(line);
      }
    });

    // ── STDERR: detect rate-limit signals ────────────────────────────────────
    proc.stderr.on('data', (chunk) => {
      stderrBuf += chunk.toString();
      const lines = stderrBuf.split('\n');
      stderrBuf = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;
        if (!rateLimitDetected) {
          const match = detectRateLimit(line, patterns, 'stderr');
          if (match.matched) {
            rateLimitDetected = true;
            rateLimitMatch    = match;
          }
        }
      }
    });

    function processClaudeLine(line) {
      let evt;
      try {
        evt = JSON.parse(line);
      } catch {
        return;
      }

      // AC #5: stream.tool_use — one event per tool_use block in assistant messages
      if (evt.type === 'assistant' && Array.isArray(evt.message?.content)) {
        for (const block of evt.message.content) {
          if (block.type === 'tool_use') {
            insertEvent(db, job.id, runId, 'info', 'stream.tool_use', {
              tool_name:   block.name || null,
              tool_use_id: block.id   || null,
            });
          }
          // AC #5: stream.text_delta — log count only, not content
          if (block.type === 'text') {
            const charCount = typeof block.text === 'string' ? block.text.length : 0;
            insertEvent(db, job.id, runId, 'info', 'stream.text_delta', {
              char_count: charCount,
            });
          }
        }
      }

      // system/api_retry heuristic
      if (evt.type === 'system' && evt.subtype === 'api_retry') {
        const ts = Date.now();
        apiRetryTimestamps.push(ts);
        // Clean timestamps older than 30 s
        const cutoff = ts - 30_000;
        while (apiRetryTimestamps.length > 0 && apiRetryTimestamps[0] < cutoff) {
          apiRetryTimestamps.shift();
        }
        if (!rateLimitDetected && apiRetryTimestamps.length > 3) {
          rateLimitDetected = true;
          rateLimitMatch    = { matched: true, category: 'transient', extract: undefined, rawExcerpt: JSON.stringify(evt).slice(0, 500) };
        }
      }

      // rate_limit_event
      if (evt.type === 'rate_limit_event' || evt.type === 'rate_limit') {
        const info = evt.rate_limit_info || evt;
        if (info.status && info.status !== 'allowed') {
          rateLimitEvent = info;
          if (!rateLimitDetected) {
            const match = detectRateLimit(JSON.stringify(info), patterns, 'result');
            if (match.matched) {
              rateLimitDetected = true;
              rateLimitMatch    = match;
            } else {
              rateLimitDetected = true;
              rateLimitMatch    = { matched: true, category: 'transient', extract: undefined, rawExcerpt: JSON.stringify(info).slice(0, 500) };
            }
          }
        }
      }

      // result event with is_error=true
      if (evt.type === 'result' && evt.is_error === true) {
        resultText = typeof evt.result === 'string' ? evt.result.slice(0, 2000) : null;
        if (!rateLimitDetected && resultText) {
          const match = detectRateLimit(resultText, patterns, 'result');
          if (match.matched) {
            rateLimitDetected = true;
            rateLimitMatch    = match;
          }
        }
      }

      // Capture normal result text and usage (AC #5: insert job.finish on result event)
      if (evt.type === 'result') {
        resultText  = typeof evt.result === 'string' ? evt.result.slice(0, 2000) : null;
        if (!evt.is_error) {
          resultUsage = evt.usage || null;
        }
        // AC #5: job.finish event on result
        insertEvent(db, job.id, runId, evt.is_error ? 'error' : 'info', 'job.finish', {
          is_error:  Boolean(evt.is_error),
          usage:     evt.usage || null,
        });
      }
    }

    proc.on('close', async (code) => {
      // Flush any remaining lines
      for (const buf of [stdoutBuf, stderrBuf]) {
        if (buf.trim()) {
          if (stdoutBuf === buf) processClaudeLine(buf);
          else {
            const match = detectRateLimit(buf, patterns, 'stderr');
            if (!rateLimitDetected && match.matched) {
              rateLimitDetected = true;
              rateLimitMatch    = match;
            }
          }
        }
      }

      const durationMs = Date.now() - startTs;

      if (rateLimitDetected) {
        const resetTs   = extractResetTs(rateLimitMatch, rateLimitEvent, nowSec());
        const waitSec   = resetTs - nowSec();
        const category  = rateLimitMatch.category || 'transient';
        const patternId = rateLimitMatch.pattern?.id || null;

        insertEvent(db, job.id, runId, 'warn', 'rate_limit_detected', {
          category,
          pattern_id: patternId,
          reset_ts:   resetTs,
          wait_sec:   waitSec,
        });

        if (waitSec <= COUNTDOWN_THRESHOLD_S) {
          // Short wait: in-process countdown then resume
          insertEvent(db, job.id, runId, 'info', 'rate_limit_countdown_start', { reset_ts: resetTs, wait_sec: waitSec });
          await runCountdown(db, job.id, runId, resetTs);
          insertEvent(db, job.id, runId, 'info', 'rate_limit_countdown_done', { reset_ts: resetTs });

          // Update run: finished with rate_limited=1
          const finishedAt = nowSec();
          db.prepare(`
            UPDATE runs SET finished_at=?, duration_ms=?, is_error=1, exit_code=?, rate_limited=1, result_text=?
            WHERE id=?
          `).run(finishedAt, durationMs, code, resultText, runId);

          resolve({
            isError:     true,
            rateLimited: true,
            resetTs,
            category,
            patternId,
            rawExcerpt:  rateLimitMatch.rawExcerpt || null,
            resultText,
            exitCode:    code,
            durationMs,
            shortWait:   true, // countdown already done; dispatcher re-queues as pending
          });
          return;
        }

        // Long wait: signal dispatcher to move to waiting_rate_limit
        const finishedAt = nowSec();
        db.prepare(`
          UPDATE runs SET finished_at=?, duration_ms=?, is_error=1, exit_code=?, rate_limited=1, result_text=?
          WHERE id=?
        `).run(finishedAt, durationMs, code, resultText, runId);

        resolve({
          isError:     true,
          rateLimited: true,
          resetTs,
          category,
          patternId,
          rawExcerpt:  rateLimitMatch.rawExcerpt || null,
          resultText,
          exitCode:    code,
          durationMs,
          shortWait:   false,
        });
        return;
      }

      // Normal finish
      const isError    = (code !== 0);
      const finishedAt = nowSec();

      // Record cost if usage is available (AC #5, #10)
      if (!isError && resultUsage && effectiveModel) {
        try {
          const { cost_usd } = calcCost(resultUsage, effectiveModel, policy);
          recordCost(db, {
            jobId:    job.id,
            runId,
            ts:       finishedAt,
            model:    effectiveModel,
            usage:    resultUsage,
            cost_usd,
          });
        } catch {
          // Non-fatal: cost recording failure should not block the state machine
        }
      }

      db.prepare(`
        UPDATE runs SET finished_at=?, duration_ms=?, is_error=?, exit_code=?, rate_limited=0, result_text=?
        WHERE id=?
      `).run(finishedAt, durationMs, isError ? 1 : 0, code, resultText, runId);

      insertEvent(db, job.id, runId, isError ? 'error' : 'info', 'finish', {
        exit_code:   code,
        duration_ms: durationMs,
        model:       effectiveModel,
        cost_usd:    resultUsage && effectiveModel
          ? calcCost(resultUsage, effectiveModel, policy).cost_usd
          : undefined,
      });

      resolve({
        isError,
        rateLimited: false,
        resetTs:    null,
        category:   null,
        patternId:  null,
        rawExcerpt: null,
        resultText,
        exitCode:   code,
        durationMs,
      });
    });

    proc.on('error', (err) => {
      const durationMs = Date.now() - startTs;
      const finishedAt = nowSec();
      db.prepare(`
        UPDATE runs SET finished_at=?, duration_ms=?, is_error=1, exit_code=-1, result_text=?
        WHERE id=?
      `).run(finishedAt, durationMs, err.message, runId);

      insertEvent(db, job.id, runId, 'error', 'spawn_error', { message: err.message });

      resolve({
        isError:     true,
        rateLimited: false,
        resetTs:    null,
        category:   null,
        patternId:  null,
        rawExcerpt: null,
        resultText: null,
        exitCode:   -1,
        durationMs,
      });
    });
  });
}

module.exports = { runWorker, resolveClaudeBin };
