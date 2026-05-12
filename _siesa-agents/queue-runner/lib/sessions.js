'use strict';

/**
 * Session Manager — resolves and persists session UUIDs by correlation_key.
 * All operations are synchronous (better-sqlite3) to maintain atomicity.
 *
 * AC #1: resolveSessionId — lookup/create by correlation_key; randomUUID for null keys.
 * AC #8: markAbandoned  — sets abandoned=1 for sessions older than olderThanS seconds.
 * AC #8: pruneStats     — dry-run count of sessions to be abandoned.
 */

const crypto = require('node:crypto');

/**
 * Current epoch seconds.
 * @returns {number}
 */
function nowSec() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Resolve or create a session UUID for a job.
 *
 * - If job.correlation_key is null/undefined: returns a new random UUID without
 *   touching the sessions table (no persistence).
 * - If correlation_key exists in sessions: updates last_used_at + invocations,
 *   returns the existing session_id.
 * - Otherwise: inserts a new row with a fresh UUID and returns it.
 *
 * @param {object} job - Row from jobs table (must have .correlation_key)
 * @param {import('better-sqlite3').Database} db
 * @returns {string} session UUID
 */
function resolveSessionId(job, db) {
  if (!job.correlation_key) {
    return { sessionId: crypto.randomUUID(), isNew: true };
  }

  const now = nowSec();

  const row = db
    .prepare('SELECT session_id FROM sessions WHERE correlation_key = ?')
    .get(job.correlation_key);

  if (row) {
    db.prepare(`
      UPDATE sessions
      SET last_used_at = ?, invocations = invocations + 1
      WHERE correlation_key = ?
    `).run(now, job.correlation_key);
    return { sessionId: row.session_id, isNew: false };
  }

  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO sessions (correlation_key, session_id, created_at, last_used_at, invocations)
    VALUES (?, ?, ?, ?, 1)
  `).run(job.correlation_key, id, now, now);
  return { sessionId: id, isNew: true };
}

/**
 * Mark sessions as abandoned when last_used_at is older than olderThanS seconds.
 * Only affects sessions with abandoned=0.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {number} olderThanS - Cut-off threshold in seconds
 * @returns {number} Number of rows updated
 */
function markAbandoned(db, olderThanS) {
  const cutoff = nowSec() - olderThanS;
  const result = db.prepare(`
    UPDATE sessions
    SET abandoned = 1
    WHERE last_used_at < ? AND abandoned = 0
  `).run(cutoff);
  return result.changes;
}

/**
 * Dry-run count of sessions that would be marked abandoned.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {number} olderThanS - Cut-off threshold in seconds
 * @returns {number} Count of sessions that would be abandoned
 */
function pruneStats(db, olderThanS) {
  const cutoff = nowSec() - olderThanS;
  const row = db.prepare(`
    SELECT COUNT(*) AS n
    FROM sessions
    WHERE last_used_at < ? AND abandoned = 0
  `).get(cutoff);
  return row.n;
}

module.exports = { resolveSessionId, markAbandoned, pruneStats };
