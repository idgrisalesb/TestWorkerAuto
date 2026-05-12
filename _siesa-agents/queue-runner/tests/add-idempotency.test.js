'use strict';

/**
 * Test: queue add idempotency (AC #5, strategy §17 #7).
 * - --from-sprint-status: second invocation with same sprint-status.yaml must produce 0 new jobs.
 * - --from-epics: second invocation must produce 0 new quick-dev jobs.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const { openDb } = require('../lib/db');
const { parseSprintStatus, getEpicStatuses } = require('../lib/sprint-status-parser');

/**
 * Compute deterministic fingerprint — mirrors logic in add.js.
 * @param {object} payload
 * @returns {string}
 */
function fingerprint(payload) {
  const normalized = Object.fromEntries(
    Object.keys(payload).sort().map((k) => [k, payload[k]]),
  );
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

/**
 * Insert individual story jobs from stories list.
 * @param {import('better-sqlite3').Database} db
 * @param {Array<{epic: number, story_id: string, status: string}>} stories
 * @returns {number} newly inserted count
 */
function insertFromStories(db, stories) {
  const JOB_TYPES = ['create-story', 'dev-story', 'code-review'];
  const now = Math.floor(Date.now() / 1000);
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO jobs
      (type, state, priority, correlation_key, payload_json, input_fingerprint,
       model_override, max_retries, attempts, not_before_ts, created_at, updated_at)
    VALUES
      (@type, 'pending', 100, @correlation_key, @payload_json, @input_fingerprint,
       NULL, 8, 0, 0, @now, @now)
  `);

  let inserted = 0;
  for (const { story_id, epic } of stories) {
    for (const type of JOB_TYPES) {
      const payload = { story_id, epic: String(epic), type };
      const fp = fingerprint(payload);
      const r = stmt.run({
        type,
        correlation_key: `story-${story_id}`,
        payload_json: JSON.stringify(payload),
        input_fingerprint: fp,
        now,
      });
      inserted += r.changes;
    }
  }
  return inserted;
}

/**
 * Insert quick-dev jobs from epic statuses (mirrors add.js --from-epics).
 * @param {import('better-sqlite3').Database} db
 * @param {Object.<number,string>} epicStatuses
 * @returns {number} newly inserted count
 */
function insertFromEpics(db, epicStatuses) {
  const now = Math.floor(Date.now() / 1000);
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO jobs
      (type, state, priority, correlation_key, payload_json, input_fingerprint,
       model_override, max_retries, attempts, not_before_ts, created_at, updated_at)
    VALUES
      (@type, 'pending', @priority, @correlation_key, @payload_json, @input_fingerprint,
       NULL, 8, 0, 0, @now, @now)
  `);

  let inserted = 0;
  const epicNumbers = Object.keys(epicStatuses).map(Number).sort((a, b) => a - b);
  for (const epicNum of epicNumbers) {
    if (epicStatuses[epicNum] === 'done') continue;
    const payload = { type: 'quick-dev', epic: epicNum };
    const fp = fingerprint(payload);
    const r = stmt.run({
      type: 'quick-dev',
      priority: 100 + epicNum,
      correlation_key: 'bmad-cycle',
      payload_json: JSON.stringify(payload),
      input_fingerprint: fp,
      now,
    });
    inserted += r.changes;
  }
  return inserted;
}

// ─── Setup ────────────────────────────────────────────────────────────────────
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'queue-idem-test-'));
const dbPath = path.join(tmpDir, 'queue.db');
const sprintPath = path.join(tmpDir, 'sprint-status.yaml');

fs.writeFileSync(sprintPath, `
development_status:
  epic-1: in-progress
    1-1: ready-for-dev
    1-2: in-progress
  epic-2: backlog
    2-1: backlog
`);

// ─── --from-sprint-status: first + second invocation ─────────────────────────
{
  const db1 = openDb(dbPath);
  const stories = parseSprintStatus(sprintPath);
  const firstCount = insertFromStories(db1, stories);
  db1.close();

  // With bug-fixed parser: only ready-for-dev and in-progress stories → 2 stories × 3 types = 6
  assert.equal(firstCount, 6, `First --from-sprint-status: expected 6 jobs, got ${firstCount}`);
  console.log(`PASS: --from-sprint-status first invocation inserted ${firstCount} jobs`);

  const db2 = openDb(dbPath);
  const stories2 = parseSprintStatus(sprintPath);
  const secondCount = insertFromStories(db2, stories2);
  db2.close();

  assert.equal(secondCount, 0, `Second --from-sprint-status: must insert 0 jobs, got ${secondCount}`);
  console.log(`PASS: --from-sprint-status idempotency confirmed (0 new jobs)`);
}

// ─── --from-epics: first + second invocation ─────────────────────────────────
{
  const db3 = openDb(dbPath);
  const epicStatuses = getEpicStatuses(sprintPath);
  const firstEpicCount = insertFromEpics(db3, epicStatuses);
  db3.close();

  // 2 non-done epics (epic-1 in-progress, epic-2 backlog) → 2 quick-dev jobs
  assert.equal(firstEpicCount, 2, `First --from-epics: expected 2 jobs, got ${firstEpicCount}`);
  console.log(`PASS: --from-epics first invocation inserted ${firstEpicCount} jobs`);

  const db4 = openDb(dbPath);
  const epicStatuses2 = getEpicStatuses(sprintPath);
  const secondEpicCount = insertFromEpics(db4, epicStatuses2);
  db4.close();

  assert.equal(secondEpicCount, 0, `Second --from-epics: must insert 0 jobs, got ${secondEpicCount}`);
  console.log(`PASS: --from-epics idempotency confirmed (0 new jobs)`);
}

// ─── --from-epics: done epics are excluded ────────────────────────────────────
{
  const db5 = openDb(path.join(tmpDir, 'queue-done-test.db'));
  const epicStatusesFull = { 1: 'done', 2: 'in-progress', 3: 'backlog' };
  const count = insertFromEpics(db5, epicStatusesFull);
  db5.close();

  assert.equal(count, 2, `Done epics excluded: expected 2 jobs (epics 2 and 3), got ${count}`);
  console.log('PASS: --from-epics excludes done epics');
}

// ─── Teardown ─────────────────────────────────────────────────────────────────
fs.rmSync(tmpDir, { recursive: true, force: true });
console.log('\nAll add-idempotency tests passed.');
