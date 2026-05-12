'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { openDb } = require('../lib/db');

/**
 * Create a unique temp DB path.
 * @returns {string}
 */
function tmpDbPath() {
  return path.join(os.tmpdir(), `queue-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

// ─── Test: openDb creates DB and applies schema ───────────────────────────────
{
  const dbPath = tmpDbPath();
  const db = openDb(dbPath);

  const version = db.pragma('user_version', { simple: true });
  assert.ok(version >= 2, `user_version should be >= 2 after schema application, got ${version}`);

  // Check all 7 tables exist
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  const tableNames = tables.map((r) => r.name);

  for (const t of ['jobs', 'runs', 'events', 'sessions', 'cost_ledger', 'rate_limit_windows', 'daemon_heartbeat']) {
    assert.ok(tableNames.includes(t), `Table '${t}' should exist`);
  }

  db.close();
  fs.unlinkSync(dbPath);
  console.log('PASS: openDb creates DB with all 7 tables and user_version>=2');
}

// ─── Test: WAL journal mode is set ───────────────────────────────────────────
{
  const dbPath = tmpDbPath();
  const db = openDb(dbPath);

  const mode = db.pragma('journal_mode', { simple: true });
  assert.equal(mode, 'wal', 'journal_mode should be WAL');

  db.close();
  fs.unlinkSync(dbPath);
  console.log('PASS: WAL journal mode enabled');
}

// ─── Test: foreign_keys are ON ────────────────────────────────────────────────
{
  const dbPath = tmpDbPath();
  const db = openDb(dbPath);

  const fk = db.pragma('foreign_keys', { simple: true });
  assert.equal(fk, 1, 'foreign_keys should be ON');

  db.close();
  fs.unlinkSync(dbPath);
  console.log('PASS: foreign_keys ON');
}

// ─── Test: opening existing DB does NOT reset schema ─────────────────────────
{
  const dbPath = tmpDbPath();
  const db1 = openDb(dbPath);

  // Insert a job
  const now = Math.floor(Date.now() / 1000);
  db1.prepare(`
    INSERT INTO jobs (type, priority, payload_json, input_fingerprint, created_at, updated_at)
    VALUES ('dev-story', 100, '{}', 'fp-abc', ?, ?)
  `).run(now, now);
  db1.close();

  // Re-open
  const db2 = openDb(dbPath);
  const count = db2.prepare('SELECT COUNT(*) AS n FROM jobs').get();
  assert.equal(count.n, 1, 'Existing data should survive re-open');
  db2.close();

  fs.unlinkSync(dbPath);
  console.log('PASS: re-opening existing DB preserves data');
}

// ─── Test: UNIQUE(input_fingerprint) prevents duplicates ──────────────────────
{
  const dbPath = tmpDbPath();
  const db = openDb(dbPath);

  const now = Math.floor(Date.now() / 1000);
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO jobs (type, priority, payload_json, input_fingerprint, created_at, updated_at)
    VALUES ('dev-story', 100, '{}', 'same-fp', ?, ?)
  `);

  const r1 = stmt.run(now, now);
  const r2 = stmt.run(now, now);

  assert.equal(r1.changes, 1, 'First insert should succeed');
  assert.equal(r2.changes, 0, 'Second insert with same fingerprint should be ignored');

  db.close();
  fs.unlinkSync(dbPath);
  console.log('PASS: UNIQUE(input_fingerprint) prevents duplicate jobs');
}

console.log('\nAll db tests passed.');
