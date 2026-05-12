'use strict';

/**
 * `queue pause` — pause the daemon (alias for `queue config set paused true`).
 * `queue resume` — resume the daemon (alias for `queue config set paused false`).
 *
 * AC #5: both commands operate immediately on the daemon via DB polling.
 */

const os   = require('node:os');
const path = require('node:path');

const { openDb } = require('../../lib/db');

const QUEUE_HOME = process.env.SIESA_QUEUE_HOME || path.join(os.homedir(), '.siesa-queue');

function setDaemonPaused(newPaused) {
  const dbPath = path.join(QUEUE_HOME, 'queue.db');
  let db;
  try {
    db = openDb(dbPath);
  } catch {
    console.error('Error: queue database not found. Is the daemon initialized?');
    process.exit(1);
  }

  const now = Math.floor(Date.now() / 1000);
  try {
    db.prepare(`
      UPDATE daemon_config SET paused=?, paused_by_budget=0, updated_at=? WHERE id=1
    `).run(newPaused ? 1 : 0, now);
  } catch (err) {
    console.error(`Error updating daemon_config: ${err.message}`);
    db.close();
    process.exit(1);
  }
  db.close();

  const action = newPaused ? 'paused' : 'resumed';
  const next   = newPaused
    ? 'The daemon will stop claiming new jobs on its next tick.'
    : 'The daemon will resume claiming jobs on its next tick.';
  console.log(`Queue ${action}. ${next}`);
}

const pauseCmd = {
  command:  'pause',
  describe: 'Pause the daemon — stop claiming new jobs (alias: queue config set paused true)',
  builder:  (y) => y,
  handler:  () => setDaemonPaused(true),
};

const resumeCmd = {
  command:  'resume',
  describe: 'Resume the daemon — start claiming jobs again (alias: queue config set paused false)',
  builder:  (y) => y,
  handler:  () => setDaemonPaused(false),
};

module.exports = { pauseCmd, resumeCmd };
