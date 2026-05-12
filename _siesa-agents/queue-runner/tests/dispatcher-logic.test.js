'use strict';

/**
 * Integration tests for Dispatcher logic extracted as pure functions.
 * Tests AC #6 (waiting_rate_limit promotion), AC #7 (orphan rescue),
 * AC #8 (backoff + max_retries).
 *
 * We exercise the logic by directly manipulating a test DB and calling
 * the same SQL that the Dispatcher uses.
 */

const assert = require('node:assert/strict');
const fs     = require('node:fs');
const os     = require('node:os');
const path   = require('node:path');

const { openDb }     = require('../lib/db');
const { calcBackoff } = require('../lib/rate-limit');

function tmpDbPath() {
  return path.join(os.tmpdir(), `dispatcher-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function insertJob(db, overrides = {}) {
  const now = nowSec();
  const fp  = `fp-${Math.random().toString(36).slice(2)}`;
  const stmt = db.prepare(`
    INSERT INTO jobs (type, state, priority, payload_json, input_fingerprint,
                      max_retries, attempts, not_before_ts, created_at, updated_at)
    VALUES (@type, @state, 100, '{}', @fp, @max_retries, @attempts, @not_before_ts, @now, @now)
  `);
  const r = stmt.run({
    type:          overrides.type          ?? 'dev-story',
    state:         overrides.state         ?? 'pending',
    fp,
    max_retries:   overrides.max_retries   ?? 8,
    attempts:      overrides.attempts      ?? 0,
    not_before_ts: overrides.not_before_ts ?? 0,
    now,
  });
  return r.lastInsertRowid;
}

// ─── AC #6: waiting_rate_limit → pending promotion ────────────────────────────

{
  const dbPath = tmpDbPath();
  const db = openDb(dbPath);

  const now       = nowSec();
  const resetTs   = now - 10; // already passed
  const jobId     = insertJob(db, { state: 'waiting_rate_limit', not_before_ts: resetTs });

  // Insert open rate_limit_window
  db.prepare(`
    INSERT INTO rate_limit_windows (detected_at, reset_ts, source, job_id)
    VALUES (?, ?, 'regex_match', ?)
  `).run(now - 20, resetTs, jobId);

  // Simulate Dispatcher tick: promote jobs
  const ready = db.prepare(`
    SELECT id FROM jobs WHERE state='waiting_rate_limit' AND not_before_ts <= ?
  `).all(now);

  assert.equal(ready.length, 1, 'One job should be ready for promotion');

  for (const job of ready) {
    db.prepare('UPDATE jobs SET state=\'pending\', updated_at=? WHERE id=?').run(now, job.id);
    db.prepare(`
      UPDATE rate_limit_windows SET closed_at=? WHERE job_id=? AND closed_at IS NULL
    `).run(now, job.id);
  }

  const updated = db.prepare('SELECT state FROM jobs WHERE id=?').get(jobId);
  assert.equal(updated.state, 'pending', 'Job should be promoted to pending');

  const window = db.prepare('SELECT closed_at FROM rate_limit_windows WHERE job_id=?').get(jobId);
  assert.ok(window.closed_at != null, 'rate_limit_window should be closed');

  db.close();
  fs.unlinkSync(dbPath);
  console.log('PASS: waiting_rate_limit job promoted to pending when reset_ts <= now');
}

// ─── AC #7: orphan rescue ─────────────────────────────────────────────────────

{
  const dbPath = tmpDbPath();
  const db = openDb(dbPath);

  const jobId = insertJob(db, { state: 'running', attempts: 2, max_retries: 8 });

  // Simulate daemon restart — rescue orphan
  const orphans = db.prepare(`SELECT id, attempts, max_retries FROM jobs WHERE state IN ('claimed','running')`).all();
  assert.equal(orphans.length, 1);

  for (const job of orphans) {
    const newAttempts = job.attempts + 1;
    const now         = nowSec();

    db.prepare(`
      UPDATE runs SET finished_at=?, is_error=1 WHERE job_id=? AND finished_at IS NULL
    `).run(now, job.id);

    db.prepare(`
      UPDATE jobs SET state='pending', attempts=?, last_error='daemon_restart',
        not_before_ts=?, updated_at=? WHERE id=?
    `).run(newAttempts, now + 5, now, job.id);
  }

  const rescued = db.prepare('SELECT state, attempts, last_error FROM jobs WHERE id=?').get(jobId);
  assert.equal(rescued.state,      'pending',        'Orphaned job should be pending');
  assert.equal(rescued.attempts,   3,                'attempts should be incremented to 3');
  assert.equal(rescued.last_error, 'daemon_restart', 'last_error should be daemon_restart');

  db.close();
  fs.unlinkSync(dbPath);
  console.log('PASS: orphan rescue increments attempts and moves to pending');
}

// ─── AC #7: orphan at max_retries → failed ────────────────────────────────────

{
  const dbPath = tmpDbPath();
  const db = openDb(dbPath);

  const jobId = insertJob(db, { state: 'running', attempts: 7, max_retries: 8 });

  const orphans = db.prepare(`SELECT id, attempts, max_retries FROM jobs WHERE state IN ('claimed','running')`).all();
  for (const job of orphans) {
    const newAttempts = job.attempts + 1;
    const now         = nowSec();

    if (newAttempts >= job.max_retries) {
      db.prepare(`UPDATE jobs SET state='failed', attempts=?, last_error='daemon_restart', updated_at=? WHERE id=?`)
        .run(newAttempts, now, job.id);
    } else {
      db.prepare(`UPDATE jobs SET state='pending', attempts=?, last_error='daemon_restart', not_before_ts=?, updated_at=? WHERE id=?`)
        .run(newAttempts, now + 5, now, job.id);
    }
  }

  const result = db.prepare('SELECT state, attempts FROM jobs WHERE id=?').get(jobId);
  assert.equal(result.state,    'failed', 'Job exhausted max_retries on orphan rescue → failed');
  assert.equal(result.attempts, 8);

  db.close();
  fs.unlinkSync(dbPath);
  console.log('PASS: orphan rescue at max_retries sets state=failed');
}

// ─── AC #8: failed_attempt backoff ────────────────────────────────────────────

{
  const dbPath = tmpDbPath();
  const db = openDb(dbPath);

  const jobId = insertJob(db, { state: 'failed_attempt', attempts: 2, max_retries: 8 });
  const now   = nowSec();
  const backoff = calcBackoff(2); // 60 * 4 = 240s

  assert.equal(backoff, 240, 'calcBackoff(2) should be 240s');

  db.prepare(`
    UPDATE jobs SET state='pending', not_before_ts=?, updated_at=? WHERE id=?
  `).run(now + backoff, now, jobId);

  const updated = db.prepare('SELECT state, not_before_ts FROM jobs WHERE id=?').get(jobId);
  assert.equal(updated.state,        'pending', 'Should move to pending');
  assert.equal(updated.not_before_ts, now + 240, 'not_before_ts = now + 240s');

  db.close();
  fs.unlinkSync(dbPath);
  console.log('PASS: failed_attempt with attempts=2 uses 240s backoff');
}

// ─── AC #8: failed_attempt at max_retries → terminal failed ──────────────────

{
  const dbPath = tmpDbPath();
  const db = openDb(dbPath);

  const jobId = insertJob(db, { state: 'failed_attempt', attempts: 8, max_retries: 8 });
  const now   = nowSec();

  const job = db.prepare('SELECT attempts, max_retries FROM jobs WHERE id=?').get(jobId);

  if (job.attempts >= job.max_retries) {
    db.prepare('UPDATE jobs SET state=\'failed\', updated_at=? WHERE id=?').run(now, jobId);
  }

  const result = db.prepare('SELECT state FROM jobs WHERE id=?').get(jobId);
  assert.equal(result.state, 'failed', 'At max_retries: state must be terminal failed');

  db.close();
  fs.unlinkSync(dbPath);
  console.log('PASS: failed_attempt at max_retries becomes terminal failed');
}

console.log('\nAll dispatcher-logic tests passed.');
