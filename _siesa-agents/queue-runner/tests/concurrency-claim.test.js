'use strict';

/**
 * Concurrency claim test (Task 3, AC #4).
 *
 * Verifies that the atomic SQL claim in dispatcher.js's claimNextJob() never
 * allows two jobs with the same correlation_key to be claimed/running
 * simultaneously, even under N>1 concurrency.
 *
 * Uses a real in-memory SQLite DB (better-sqlite3) with the queue schema.
 */

const assert   = require('node:assert/strict');
const os       = require('node:os');
const path     = require('node:path');
const fs       = require('node:fs');
const Database = require('better-sqlite3');

const SCHEMA_PATH = path.join(__dirname, '../lib/schema.sql');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function openTestDb() {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous  = NORMAL');
  db.pragma('foreign_keys = ON');
  const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(sql);
  // Apply migration 004 manually (column may not exist in schema yet)
  try {
    db.exec('ALTER TABLE daemon_config ADD COLUMN concurrency INTEGER NOT NULL DEFAULT 1;');
  } catch { /* already present */ }
  return db;
}

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Insert a pending job with the given correlation_key.
 * Returns the inserted job id.
 */
function insertJob(db, correlationKey, priority) {
  const fp = `fp-${correlationKey}-${priority}-${Math.random()}`;
  const now = nowSec();
  const result = db.prepare(`
    INSERT INTO jobs (type, state, priority, correlation_key, payload_json, input_fingerprint,
                      max_retries, attempts, not_before_ts, created_at, updated_at)
    VALUES ('dev-story', 'pending', ?, ?, '{}', ?, 8, 0, 0, ?, ?)
  `).run(priority, correlationKey, fp, now, now);
  return result.lastInsertRowid;
}

/**
 * Atomically claim the next eligible pending job — same SQL as dispatcher.js claimNextJob().
 * Returns the claimed job row or null.
 */
function claimNextJob(db) {
  const now = nowSec();

  return db.transaction(() => {
    const job = db.prepare(`
      SELECT id, correlation_key
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
      LIMIT 1
    `).get(now);

    if (!job) return null;

    db.prepare(`UPDATE jobs SET state = 'claimed', updated_at = ? WHERE id = ?`)
      .run(now, job.id);

    return job;
  })();
}

// ─── Test: never two jobs with same correlation_key in claimed/running ────────

{
  const db = openTestDb();

  // Insert 4 jobs: 2 with correlation_key='story-1', 2 with 'story-2'
  insertJob(db, 'story-1', 100);  // id 1
  insertJob(db, 'story-1', 100);  // id 2
  insertJob(db, 'story-2', 100);  // id 3
  insertJob(db, 'story-2', 100);  // id 4

  // Simulate MAX_CONCURRENCY=2: claim two jobs
  const j1 = claimNextJob(db);
  const j2 = claimNextJob(db);
  const j3 = claimNextJob(db); // should be null — both correlation_keys have a claimed job

  assert.ok(j1 !== null, 'First claim succeeds');
  assert.ok(j2 !== null, 'Second claim succeeds');
  assert.equal(j3, null, 'Third claim returns null: both story-1 and story-2 have an active job');

  // The two claimed jobs must have DIFFERENT correlation_keys
  assert.notEqual(j1.correlation_key, j2.correlation_key,
    'The two active jobs have different correlation_keys');

  // Verify exactly one job per key is in claimed state
  const claimed = db.prepare(`SELECT correlation_key FROM jobs WHERE state = 'claimed'`).all();
  const keys = claimed.map((r) => r.correlation_key);
  const unique = new Set(keys);
  assert.equal(unique.size, claimed.length,
    'No two claimed jobs share a correlation_key');

  console.log('PASS: atomic claim never allows two jobs with same correlation_key simultaneously');
  db.close();
}

// ─── Test: releasing a job allows the next job with same key to be claimed ───

{
  const db = openTestDb();

  insertJob(db, 'story-1', 100);  // id 1
  insertJob(db, 'story-1', 200);  // id 2 (lower priority)

  const j1 = claimNextJob(db);    // claims job 1
  assert.ok(j1, 'First job claimed');
  assert.equal(j1.correlation_key, 'story-1');

  const blocked = claimNextJob(db); // should be null — story-1 still active
  assert.equal(blocked, null, 'Second story-1 job blocked while first is active');

  // "Complete" first job → move to succeeded
  db.prepare(`UPDATE jobs SET state = 'succeeded', updated_at = ? WHERE id = ?`)
    .run(nowSec(), j1.id);

  const j2 = claimNextJob(db); // now story-1 slot is free
  assert.ok(j2, 'Second story-1 job claimed after first completes');
  assert.equal(j2.correlation_key, 'story-1');

  console.log('PASS: next job with same correlation_key is claimed after predecessor completes');
  db.close();
}

// ─── Test: NULL correlation_key jobs are always claimable ────────────────────

{
  const db = openTestDb();

  // Insert one job with correlation_key = null
  const now = nowSec();
  const fp = `fp-null-${Math.random()}`;
  db.prepare(`
    INSERT INTO jobs (type, state, priority, correlation_key, payload_json, input_fingerprint,
                      max_retries, attempts, not_before_ts, created_at, updated_at)
    VALUES ('dev-story', 'pending', 100, NULL, '{}', ?, 8, 0, 0, ?, ?)
  `).run(fp, now, now);

  // Also insert a job with correlation_key that is already active
  const fp2 = `fp-story3-${Math.random()}`;
  db.prepare(`
    INSERT INTO jobs (type, state, priority, correlation_key, payload_json, input_fingerprint,
                      max_retries, attempts, not_before_ts, created_at, updated_at)
    VALUES ('dev-story', 'claimed', 100, 'story-3', '{}', ?, 8, 0, 0, ?, ?)
  `).run(fp2, now, now);

  const j = claimNextJob(db); // should claim the NULL key job
  assert.ok(j, 'NULL correlation_key job is claimed');
  assert.equal(j.correlation_key, null, 'Claimed job has NULL correlation_key');

  console.log('PASS: NULL correlation_key jobs are always claimable');
  db.close();
}

// ─── Test: multiple quick-dev jobs with correlation_key="bmad-cycle" are sequential ──

{
  const db = openTestDb();

  // Insert 3 quick-dev jobs all with correlation_key='bmad-cycle' (different priorities/epics)
  const fp1 = `fp-bmad-1-${Math.random()}`;
  const fp2 = `fp-bmad-2-${Math.random()}`;
  const fp3 = `fp-bmad-3-${Math.random()}`;
  const now = nowSec();
  db.prepare(`
    INSERT INTO jobs (type, state, priority, correlation_key, payload_json, input_fingerprint,
                      max_retries, attempts, not_before_ts, created_at, updated_at)
    VALUES ('quick-dev', 'pending', 101, 'bmad-cycle', '{"type":"quick-dev","epic":1}', ?, 8, 0, 0, ?, ?)
  `).run(fp1, now, now);
  db.prepare(`
    INSERT INTO jobs (type, state, priority, correlation_key, payload_json, input_fingerprint,
                      max_retries, attempts, not_before_ts, created_at, updated_at)
    VALUES ('quick-dev', 'pending', 102, 'bmad-cycle', '{"type":"quick-dev","epic":2}', ?, 8, 0, 0, ?, ?)
  `).run(fp2, now, now);
  db.prepare(`
    INSERT INTO jobs (type, state, priority, correlation_key, payload_json, input_fingerprint,
                      max_retries, attempts, not_before_ts, created_at, updated_at)
    VALUES ('quick-dev', 'pending', 103, 'bmad-cycle', '{"type":"quick-dev","epic":3}', ?, 8, 0, 0, ?, ?)
  `).run(fp3, now, now);

  const j1 = claimNextJob(db);
  assert.ok(j1, 'First quick-dev job claimed');
  assert.equal(j1.correlation_key, 'bmad-cycle');

  // Second claim should be null — bmad-cycle already has an active job
  const j2 = claimNextJob(db);
  assert.equal(j2, null, 'Second quick-dev job blocked while first is active (sequential enforcement)');

  // Complete first job
  db.prepare(`UPDATE jobs SET state = 'succeeded', updated_at = ? WHERE id = ?`)
    .run(nowSec(), j1.id);

  // Now epic-2 job can be claimed
  const j3 = claimNextJob(db);
  assert.ok(j3, 'Epic-2 job claimed after epic-1 completes');
  assert.equal(j3.correlation_key, 'bmad-cycle', 'Claimed job uses bmad-cycle key');

  console.log('PASS: quick-dev jobs with bmad-cycle correlation_key execute strictly sequentially');
  db.close();
}

console.log('\nAll concurrency-claim tests passed.');
