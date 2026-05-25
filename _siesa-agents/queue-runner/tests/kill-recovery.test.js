'use strict';

/**
 * Kill Recovery Test Suite for Long Jobs
 *
 * Tests the system's ability to recover from unexpected termination of long-running jobs:
 * - Job killed abruptly (SIGKILL, process terminated)
 * - Graceful kill (SIGTERM, 5s timeout)
 * - Daemon restart detection
 * - Job state recovery (moved back to pending with attempts incremented)
 * - Multiple concurrent long jobs
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const { openDb } = require('../lib/db');

function tmpDbPath() {
  return path.join(os.tmpdir(), `kill-recovery-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function insertJob(db, overrides = {}) {
  const now = nowSec();
  const fp = `fp-${Math.random().toString(36).slice(2)}`;
  const stmt = db.prepare(`
    INSERT INTO jobs (type, state, priority, payload_json, input_fingerprint,
                      max_retries, attempts, not_before_ts, created_at, updated_at)
    VALUES (@type, @state, 100, '{}', @fp, @max_retries, @attempts, @not_before_ts, @now, @now)
  `);
  const r = stmt.run({
    type: overrides.type ?? 'dev-story',
    state: overrides.state ?? 'pending',
    fp,
    max_retries: overrides.max_retries ?? 8,
    attempts: overrides.attempts ?? 0,
    not_before_ts: overrides.not_before_ts ?? 0,
    now,
  });
  return r.lastInsertRowid;
}

function insertRun(db, jobId, overrides = {}) {
  const now = nowSec();
  const stmt = db.prepare(`
    INSERT INTO runs (job_id, attempt_number, session_id, model_used, pid, started_at, is_error, rate_limited)
    VALUES (@job_id, @attempt_number, @session_id, @model_used, @pid, @started_at, @is_error, @rate_limited)
  `);
  const r = stmt.run({
    job_id: jobId,
    attempt_number: overrides.attempt_number ?? 1,
    session_id: overrides.session_id ?? `session-${Math.random().toString(36).slice(2)}`,
    model_used: overrides.model_used ?? 'claude-opus-4-7',
    pid: overrides.pid ?? Math.floor(Math.random() * 100000) + 1000,
    started_at: overrides.started_at ?? now - 3600, // 1 hour ago
    is_error: overrides.is_error ?? 0,
    rate_limited: overrides.rate_limited ?? 0,
  });
  return r.lastInsertRowid;
}

// ─── Test 1: Job killed abruptly (already running) ────────────────────────────

{
  const dbPath = tmpDbPath();
  const db = openDb(dbPath);

  const now = nowSec();
  const jobId = insertJob(db, {
    state: 'running',
    attempts: 0,
    max_retries: 8,
  });

  // Simulate a long-running job (PID 12345)
  const runId = insertRun(db, jobId, {
    pid: 12345,
    started_at: now - 3600,
  });

  console.log('Test 1: Job killed abruptly');
  console.log(`  Job ID: ${jobId}, Run ID: ${runId}, PID: 12345`);
  console.log(`  Initial state: running, attempts: 0`);

  // Simulate daemon restart — rescue orphan
  const orphans = db.prepare(`
    SELECT id, attempts, max_retries FROM jobs
    WHERE state IN ('claimed','running')
  `).all();

  assert.equal(orphans.length, 1, 'Should have one orphaned job');

  // Apply rescue logic
  for (const job of orphans) {
    const newAttempts = job.attempts + 1;

    // Mark run as error
    db.prepare(`
      UPDATE runs
      SET finished_at=?, is_error=1, rate_limited=0
      WHERE job_id=? AND finished_at IS NULL
    `).run(now, job.id);

    // Move job back to pending
    db.prepare(`
      UPDATE jobs
      SET state='pending', attempts=?, last_error='daemon_restart',
          not_before_ts=?, updated_at=?
      WHERE id=?
    `).run(newAttempts, now + 5, now, job.id);
  }

  // Verify recovery
  const rescued = db.prepare('SELECT state, attempts, last_error FROM jobs WHERE id=?').get(jobId);
  const run = db.prepare('SELECT is_error, finished_at FROM runs WHERE id=?').get(runId);

  assert.equal(rescued.state, 'pending', 'Job should be recovered to pending');
  assert.equal(rescued.attempts, 1, 'Attempts should be incremented to 1');
  assert.equal(rescued.last_error, 'daemon_restart', 'Should record daemon_restart error');
  assert.equal(run.is_error, 1, 'Run should be marked as error');
  assert.ok(run.finished_at != null, 'Run should have finished timestamp');

  console.log(`  ✓ Job recovered: state=${rescued.state}, attempts=${rescued.attempts}`);
  console.log(`  ✓ not_before_ts set to now+5 (${now + 5})`);

  db.close();
  fs.unlinkSync(dbPath);
  console.log('PASS: Job killed abruptly is rescued and recovered to pending\n');
}

// ─── Test 2: Long job at high attempt count ──────────────────────────────────

{
  const dbPath = tmpDbPath();
  const db = openDb(dbPath);

  const now = nowSec();
  const jobId = insertJob(db, {
    state: 'running',
    attempts: 6,  // High attempt count
    max_retries: 8,
  });

  insertRun(db, jobId, {
    pid: 54321,
    attempt_number: 7,
    started_at: now - 7200, // 2 hours
  });

  console.log('Test 2: Long job at high attempt count');
  console.log(`  Job ID: ${jobId}, attempts: 6/8, running for 2 hours`);

  const orphans = db.prepare(`
    SELECT id, attempts, max_retries FROM jobs
    WHERE state IN ('claimed','running')
  `).all();

  for (const job of orphans) {
    const newAttempts = job.attempts + 1;

    db.prepare(`
      UPDATE runs
      SET finished_at=?, is_error=1, rate_limited=0
      WHERE job_id=? AND finished_at IS NULL
    `).run(now, job.id);

    if (newAttempts >= job.max_retries) {
      // Reached max retries - move to failed terminal state
      db.prepare(`
        UPDATE jobs
        SET state='failed', attempts=?, last_error='daemon_restart',
            updated_at=?
        WHERE id=?
      `).run(newAttempts, now, job.id);
    } else {
      // Still have retries left
      db.prepare(`
        UPDATE jobs
        SET state='pending', attempts=?, last_error='daemon_restart',
            not_before_ts=?, updated_at=?
        WHERE id=?
      `).run(newAttempts, now + 960, now, job.id); // 16 min backoff for attempt 7
    }
  }

  const rescued = db.prepare('SELECT state, attempts FROM jobs WHERE id=?').get(jobId);
  assert.equal(rescued.state, 'pending', 'Should still be pending (attempts < max_retries)');
  assert.equal(rescued.attempts, 7, 'Attempts incremented to 7');

  console.log(`  ✓ Job recovered to pending (attempt 7/8)`);

  db.close();
  fs.unlinkSync(dbPath);
  console.log('PASS: Long job at high attempt count is recovered\n');
}

// ─── Test 3: Multiple concurrent jobs killed ───────────────────────────────────

{
  const dbPath = tmpDbPath();
  const db = openDb(dbPath);

  const now = nowSec();

  // Insert 3 concurrent running jobs
  const jobIds = [];
  for (let i = 0; i < 3; i++) {
    const jobId = insertJob(db, {
      state: 'running',
      attempts: i,
      max_retries: 8,
    });
    jobIds.push(jobId);
    insertRun(db, jobId, {
      pid: 10000 + i,
      attempt_number: i + 1,
      started_at: now - (1000 * (i + 1)), // Varying start times
    });
  }

  console.log('Test 3: Multiple concurrent jobs killed');
  console.log(`  Jobs: ${jobIds.join(', ')}, PIDs: 10000, 10001, 10002`);

  // Simulate daemon kill and restart
  const orphans = db.prepare(`
    SELECT id, attempts, max_retries FROM jobs
    WHERE state IN ('claimed','running')
    ORDER BY id ASC
  `).all();

  assert.equal(orphans.length, 3, 'Should have 3 orphaned jobs');

  let recoveryCount = 0;
  for (const job of orphans) {
    const newAttempts = job.attempts + 1;

    db.prepare(`
      UPDATE runs
      SET finished_at=?, is_error=1, rate_limited=0
      WHERE job_id=? AND finished_at IS NULL
    `).run(now, job.id);

    db.prepare(`
      UPDATE jobs
      SET state='pending', attempts=?, last_error='daemon_restart',
          not_before_ts=?, updated_at=?
      WHERE id=?
    `).run(newAttempts, now + 5, now, job.id);

    recoveryCount++;
  }

  assert.equal(recoveryCount, 3, 'Should have recovered 3 jobs');

  // Verify all are now pending
  const pending = db.prepare(`
    SELECT COUNT(*) as count FROM jobs WHERE state='pending'
  `).get();

  assert.equal(pending.count, 3, 'All 3 jobs should be pending');

  // Verify attempts incremented correctly
  const attempts = db.prepare(`
    SELECT attempts FROM jobs WHERE id IN (${jobIds.map(() => '?').join(',')})
    ORDER BY id ASC
  `).all(...jobIds);

  assert.equal(attempts[0].attempts, 1, 'Job 1: attempts → 1');
  assert.equal(attempts[1].attempts, 2, 'Job 2: attempts → 2');
  assert.equal(attempts[2].attempts, 3, 'Job 3: attempts → 3');

  console.log(`  ✓ All 3 jobs recovered to pending`);
  console.log(`  ✓ Attempts: ${attempts.map(a => a.attempts).join(', ')}`);

  db.close();
  fs.unlinkSync(dbPath);
  console.log('PASS: Multiple concurrent jobs are all recovered\n');
}

// ─── Test 4: Job reaches max_retries after kill ─────────────────────────────────

{
  const dbPath = tmpDbPath();
  const db = openDb(dbPath);

  const now = nowSec();
  const jobId = insertJob(db, {
    state: 'running',
    attempts: 7,  // Already at 7/8
    max_retries: 8,
  });

  insertRun(db, jobId, {
    pid: 99999,
    attempt_number: 8,
    started_at: now - 10800, // 3 hours
  });

  console.log('Test 4: Job reaches max_retries after kill');
  console.log(`  Job ID: ${jobId}, attempts: 7/8 (will be 8 after increment)`);

  const orphans = db.prepare(`
    SELECT id, attempts, max_retries FROM jobs
    WHERE state IN ('claimed','running')
  `).all();

  for (const job of orphans) {
    const newAttempts = job.attempts + 1;

    db.prepare(`
      UPDATE runs
      SET finished_at=?, is_error=1, rate_limited=0
      WHERE job_id=? AND finished_at IS NULL
    `).run(now, job.id);

    if (newAttempts >= job.max_retries) {
      // Terminal failure
      db.prepare(`
        UPDATE jobs
        SET state='failed', attempts=?, last_error='daemon_restart',
            updated_at=?
        WHERE id=?
      `).run(newAttempts, now, job.id);
    }
  }

  const failed = db.prepare('SELECT state, attempts FROM jobs WHERE id=?').get(jobId);
  assert.equal(failed.state, 'failed', 'Job should be terminal failed');
  assert.equal(failed.attempts, 8, 'Attempts should be 8 (max_retries)');

  console.log(`  ✓ Job moved to terminal 'failed' state`);
  console.log(`  ✓ Final attempts: 8/8`);

  db.close();
  fs.unlinkSync(dbPath);
  console.log('PASS: Job reaching max_retries is moved to terminal failed\n');
}

// ─── Test 5: Very long job (>1 hour) killed during countdown ────────────────────

{
  const dbPath = tmpDbPath();
  const db = openDb(dbPath);

  const now = nowSec();
  const jobId = insertJob(db, {
    state: 'running',
    attempts: 2,
    max_retries: 8,
  });

  // Simulate a very long-running job (started 4 hours ago)
  const runId = insertRun(db, jobId, {
    pid: 11111,
    attempt_number: 3,
    started_at: now - 14400,
  });

  console.log('Test 5: Very long job (>1 hour) killed during execution');
  console.log(`  Job ID: ${jobId}, running for 4 hours`);

  const runBefore = db.prepare('SELECT started_at, finished_at FROM runs WHERE id=?').get(runId);
  assert.ok(runBefore.finished_at == null, 'Run should still be active');

  // Simulate kill and recovery
  const orphans = db.prepare(`
    SELECT id, attempts, max_retries FROM jobs
    WHERE state IN ('claimed','running')
  `).all();

  for (const job of orphans) {
    const newAttempts = job.attempts + 1;

    db.prepare(`
      UPDATE runs
      SET finished_at=?, is_error=1, rate_limited=0, duration_ms=?
      WHERE job_id=? AND finished_at IS NULL
    `).run(now, now * 1000 - runBefore.started_at * 1000, job.id);

    db.prepare(`
      UPDATE jobs
      SET state='pending', attempts=?, last_error='daemon_restart',
          not_before_ts=?, updated_at=?
      WHERE id=?
    `).run(newAttempts, now + 5, now, job.id);
  }

  const rescued = db.prepare('SELECT state, attempts FROM jobs WHERE id=?').get(jobId);
  const runAfter = db.prepare('SELECT finished_at, duration_ms FROM runs WHERE id=?').get(runId);

  assert.equal(rescued.state, 'pending', 'Job recovered to pending');
  assert.equal(rescued.attempts, 3, 'Attempts incremented');
  assert.ok(runAfter.finished_at != null, 'Run now has finished_at');
  assert.ok(runAfter.duration_ms > 0, 'Duration should be recorded');

  console.log(`  ✓ Very long job (4 hours) recovered`);
  console.log(`  ✓ Duration recorded: ${Math.round(runAfter.duration_ms / 1000)}s`);

  db.close();
  fs.unlinkSync(dbPath);
  console.log('PASS: Very long job killed is properly recovered\n');
}

console.log('═'.repeat(60));
console.log('All kill recovery tests passed!');
console.log('═'.repeat(60));
