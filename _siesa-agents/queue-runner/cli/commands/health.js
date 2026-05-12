'use strict';

/**
 * `queue health` — read-only heartbeat check.
 * Prints daemon status and exits with:
 *   0 — heartbeat fresh
 *   2 — heartbeat stale or no daemon
 */

const os   = require('node:os');
const path = require('node:path');

const { openDb }    = require('../../lib/db');
const { formatTs }  = require('../../lib/format');

const STALE_S = parseInt(process.env.SIESA_QUEUE_HEARTBEAT_STALE_S || '180', 10);

async function handler() {
  const queueHome = process.env.SIESA_QUEUE_HOME || path.join(os.homedir(), '.siesa-queue');
  const dbPath    = path.join(queueHome, 'queue.db');

  let db;
  try {
    db = openDb(dbPath);
  } catch {
    console.log('no daemon registered (database not found)');
    process.exit(0);
  }

  const row = db.prepare('SELECT pid, host, started_at, last_beat_ts, in_flight, version FROM daemon_heartbeat WHERE id=1').get();
  db.close();

  if (!row) {
    console.log('no daemon registered');
    process.exit(0);
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const age    = nowSec - row.last_beat_ts;
  const stale  = age > STALE_S;

  console.log(`pid        : ${row.pid}`);
  console.log(`host       : ${row.host}`);
  console.log(`version    : ${row.version || '-'}`);
  console.log(`started_at : ${formatTs(row.started_at)}`);
  console.log(`last_beat  : ${formatTs(row.last_beat_ts)} (${age}s ago)`);
  console.log(`in_flight  : ${row.in_flight}`);
  console.log(`status     : ${stale ? `STALE (>${STALE_S}s)` : 'ok'}`);

  process.exit(stale ? 2 : 0);
}

module.exports = {
  command: 'health',
  describe: 'Check daemon heartbeat (read-only). Exit 0=ok, 2=stale/missing.',
  builder: (yargs) => yargs,
  handler,
};
