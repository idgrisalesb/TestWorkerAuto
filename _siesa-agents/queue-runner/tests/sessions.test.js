'use strict';

/**
 * Unit tests for lib/sessions.js
 * Covers AC #1 (resolveSessionId), AC #8 (markAbandoned, pruneStats)
 */

const assert = require('node:assert/strict');
const fs     = require('node:fs');
const os     = require('node:os');
const path   = require('node:path');

const { openDb }                            = require('../lib/db');
const { resolveSessionId, markAbandoned, pruneStats } = require('../lib/sessions');

function tmpDbPath() {
  return path.join(os.tmpdir(), `sessions-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function insertJob(db, overrides = {}) {
  const now = nowSec();
  const fp  = `fp-${Math.random().toString(36).slice(2)}`;
  const r   = db.prepare(`
    INSERT INTO jobs (type, state, priority, payload_json, input_fingerprint,
                      max_retries, attempts, not_before_ts, correlation_key, created_at, updated_at)
    VALUES (@type, 'pending', 100, '{}', @fp, 8, 0, 0, @corr, @now, @now)
  `).run({
    type: overrides.type ?? 'dev-story',
    fp,
    corr: overrides.correlation_key ?? null,
    now,
  });
  return { id: r.lastInsertRowid, correlation_key: overrides.correlation_key ?? null };
}

// ─── AC #1: null correlation_key → random UUID, no DB write ──────────────────
{
  const dbPath = tmpDbPath();
  const db     = openDb(dbPath);
  const job    = insertJob(db, { correlation_key: null });

  const { sessionId: id1, isNew: new1 } = resolveSessionId(job, db);
  const { sessionId: id2 }              = resolveSessionId(job, db);

  assert.ok(typeof id1 === 'string' && id1.length === 36, 'resolveSessionId returns a UUID string');
  assert.ok(new1 === true, 'isNew=true for null correlation_key');
  assert.notEqual(id1, id2, 'Null correlation_key produces different UUIDs each time');

  const rows = db.prepare('SELECT COUNT(*) AS n FROM sessions').get();
  assert.equal(rows.n, 0, 'No session row inserted for null correlation_key');

  db.close();
  fs.unlinkSync(dbPath);
  console.log('PASS: resolveSessionId null key → random UUID, no DB write');
}

// ─── AC #1: new correlation_key → creates session row ────────────────────────
{
  const dbPath = tmpDbPath();
  const db     = openDb(dbPath);
  const job    = insertJob(db, { correlation_key: 'story-1-3' });

  const { sessionId: id, isNew } = resolveSessionId(job, db);

  assert.ok(typeof id === 'string' && id.length === 36, 'Returns a UUID');
  assert.ok(isNew === true, 'isNew=true for new correlation_key');

  const row = db.prepare('SELECT * FROM sessions WHERE correlation_key=?').get('story-1-3');
  assert.ok(row,                    'Session row created');
  assert.equal(row.session_id, id,  'session_id matches returned UUID');
  assert.equal(row.invocations, 1,  'invocations starts at 1');
  assert.equal(row.abandoned, 0,    'abandoned=0');

  db.close();
  fs.unlinkSync(dbPath);
  console.log('PASS: resolveSessionId new key → creates session with invocations=1');
}

// ─── AC #1: existing correlation_key → returns same UUID, increments invocations
{
  const dbPath = tmpDbPath();
  const db     = openDb(dbPath);
  const job    = insertJob(db, { correlation_key: 'story-1-3' });

  const { sessionId: id1, isNew: new1 } = resolveSessionId(job, db); // creates
  const { sessionId: id2, isNew: new2 } = resolveSessionId(job, db); // reuses
  const { sessionId: id3 }              = resolveSessionId(job, db); // reuses again

  assert.ok(new1 === true,  'First call: isNew=true');
  assert.ok(new2 === false, 'Second call: isNew=false (existing session)');
  assert.equal(id1, id2, 'Second call returns same session_id');
  assert.equal(id2, id3, 'Third call returns same session_id');

  const row = db.prepare('SELECT invocations FROM sessions WHERE correlation_key=?').get('story-1-3');
  assert.equal(row.invocations, 3, 'invocations incremented on each reuse');

  db.close();
  fs.unlinkSync(dbPath);
  console.log('PASS: resolveSessionId existing key → same UUID, invocations incremented');
}

// ─── AC #1: Three jobs sharing same correlation_key use the same session ──────
{
  const dbPath = tmpDbPath();
  const db     = openDb(dbPath);

  const key = 'story-2-1';
  const j1  = insertJob(db, { correlation_key: key, type: 'create-story' });
  const j2  = insertJob(db, { correlation_key: key, type: 'dev-story' });
  const j3  = insertJob(db, { correlation_key: key, type: 'code-review' });

  const { sessionId: s1 } = resolveSessionId(j1, db);
  const { sessionId: s2 } = resolveSessionId(j2, db);
  const { sessionId: s3 } = resolveSessionId(j3, db);

  assert.equal(s1, s2, 'create-story and dev-story share session');
  assert.equal(s2, s3, 'dev-story and code-review share session');

  const row = db.prepare('SELECT invocations FROM sessions WHERE correlation_key=?').get(key);
  assert.equal(row.invocations, 3, 'Three invocations recorded');

  db.close();
  fs.unlinkSync(dbPath);
  console.log('PASS: Three jobs with same correlation_key share one session (invocations=3)');
}

// ─── AC #8: pruneStats returns count without modifying ───────────────────────
{
  const dbPath = tmpDbPath();
  const db     = openDb(dbPath);
  const nowS   = nowSec();

  // Insert two old sessions and one recent
  db.prepare(`
    INSERT INTO sessions (correlation_key, session_id, created_at, last_used_at, invocations)
    VALUES (?, ?, ?, ?, 1)
  `).run('old-1', 'uuid-1', nowS - 100000, nowS - 100000);
  db.prepare(`
    INSERT INTO sessions (correlation_key, session_id, created_at, last_used_at, invocations)
    VALUES (?, ?, ?, ?, 1)
  `).run('old-2', 'uuid-2', nowS - 200000, nowS - 200000);
  db.prepare(`
    INSERT INTO sessions (correlation_key, session_id, created_at, last_used_at, invocations)
    VALUES (?, ?, ?, ?, 1)
  `).run('recent', 'uuid-3', nowS - 1000, nowS - 1000);

  const count = pruneStats(db, 50000); // 50000 s cut-off → only "old-1" and "old-2" qualify
  assert.equal(count, 2, 'pruneStats returns 2 (the two old sessions)');

  // Verify no rows were actually modified
  const allRows = db.prepare('SELECT abandoned FROM sessions').all();
  assert.ok(allRows.every((r) => r.abandoned === 0), 'pruneStats must not modify any rows');

  db.close();
  fs.unlinkSync(dbPath);
  console.log('PASS: pruneStats dry-run returns correct count without modifying rows');
}

// ─── AC #8: markAbandoned marks old sessions, leaves recent intact ────────────
{
  const dbPath = tmpDbPath();
  const db     = openDb(dbPath);
  const nowS   = nowSec();

  db.prepare(`
    INSERT INTO sessions (correlation_key, session_id, created_at, last_used_at, invocations)
    VALUES ('old-a', 'ua', ?, ?, 1)
  `).run(nowS - 90000, nowS - 90000);
  db.prepare(`
    INSERT INTO sessions (correlation_key, session_id, created_at, last_used_at, invocations)
    VALUES ('recent-b', 'ub', ?, ?, 1)
  `).run(nowS - 100, nowS - 100);

  const affected = markAbandoned(db, 86400); // 1-day cut-off → 'old-a' qualifies

  assert.equal(affected, 1, 'One session should be abandoned');

  const oldRow    = db.prepare('SELECT abandoned FROM sessions WHERE correlation_key=?').get('old-a');
  const recentRow = db.prepare('SELECT abandoned FROM sessions WHERE correlation_key=?').get('recent-b');

  assert.equal(oldRow.abandoned,    1, 'old session marked abandoned=1');
  assert.equal(recentRow.abandoned, 0, 'recent session remains abandoned=0');

  db.close();
  fs.unlinkSync(dbPath);
  console.log('PASS: markAbandoned marks old sessions, leaves recent intact');
}

// ─── AC #8: markAbandoned does not re-abandon already-abandoned sessions ──────
{
  const dbPath = tmpDbPath();
  const db     = openDb(dbPath);
  const nowS   = nowSec();

  db.prepare(`
    INSERT INTO sessions (correlation_key, session_id, created_at, last_used_at, invocations, abandoned)
    VALUES ('already', 'ux', ?, ?, 1, 1)
  `).run(nowS - 200000, nowS - 200000);

  const affected = markAbandoned(db, 86400);
  assert.equal(affected, 0, 'Already-abandoned session should not be re-updated');

  db.close();
  fs.unlinkSync(dbPath);
  console.log('PASS: markAbandoned skips already-abandoned sessions');
}

console.log('\nAll sessions tests passed.');
