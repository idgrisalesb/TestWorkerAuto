'use strict';

/**
 * Watchdog: checks daemon heartbeat, optionally restarts if stale.
 *
 * Exit codes:
 *   0 — heartbeat fresh (or no daemon registered)
 *   2 — heartbeat stale (daemon may be blocked or dead)
 *
 * Usage:
 *   node watchdog.js           — check + restart if stale (full watchdog mode)
 *   node watchdog.js --health  — check only, no restart (read-only)
 */

const os   = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { openDb } = require('../lib/db');

const STALE_S        = parseInt(process.env.SIESA_QUEUE_HEARTBEAT_STALE_S  || '180', 10);
const QUEUE_HOME     = process.env.SIESA_QUEUE_HOME || path.join(os.homedir(), '.siesa-queue');
const DB_PATH        = path.join(QUEUE_HOME, 'queue.db');
const DAEMON_ENTRY   = path.join(__dirname, 'dispatcher.js');

const healthOnly = process.argv.includes('--health');

/**
 * Check if a process with the given pid is alive.
 * @param {number} pid
 * @returns {boolean}
 */
function processAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Attempt to restart the daemon via a detached spawn.
 * @param {string} daemonEntry
 */
function restartDaemon(daemonEntry) {
  const child = spawnSync(process.execPath, [daemonEntry], {
    detached: true,
    stdio:    'ignore',
  });
  if (child.error) {
    console.error(`watchdog: restart failed — ${child.error.message}`);
  } else {
    console.log(`watchdog: daemon restart initiated (pid ${child.pid})`);
  }
}

function run() {
  let db;
  try {
    db = openDb(DB_PATH);
  } catch (err) {
    // DB may not exist yet
    console.log('watchdog: no queue database found — no daemon registered');
    process.exit(0);
  }

  const row = db.prepare('SELECT pid, last_beat_ts FROM daemon_heartbeat WHERE id=1').get();
  db.close();

  if (!row) {
    console.log('watchdog: no daemon registered');
    process.exit(0);
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const age    = nowSec - row.last_beat_ts;

  if (age > STALE_S) {
    const alive = processAlive(row.pid);
    console.error(`watchdog: heartbeat stale (${age}s > ${STALE_S}s), pid=${row.pid}, alive=${alive}`);

    if (!healthOnly) {
      if (alive) {
        // Process exists but is unresponsive (blocked) — send SIGTERM
        try {
          process.kill(row.pid, 'SIGTERM');
          console.log(`watchdog: SIGTERM sent to pid ${row.pid}`);
        } catch (err) {
          console.error(`watchdog: could not kill pid ${row.pid} — ${err.message}`);
        }
      }
      // Restart daemon (systemd/cron handles the actual restart; we spawn as fallback)
      restartDaemon(DAEMON_ENTRY);
    }

    process.exit(2);
  } else {
    console.log(`ok (heartbeat ${age}s ago, pid=${row.pid})`);
    process.exit(0);
  }
}

run();
