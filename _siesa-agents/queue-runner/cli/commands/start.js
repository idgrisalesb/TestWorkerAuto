'use strict';

/**
 * `queue start` — start the dispatcher daemon.
 *
 * AC #1: queue start --foreground [--verbose] [--concurrency 1]
 *   --foreground : run dispatcher in the current process (default=true unless --detach)
 *   --verbose    : enable debug logging (sets SIESA_QUEUE_LOG_LEVEL=debug)
 *   --concurrency: override max concurrent workers (sets SIESA_QUEUE_MAX_CONCURRENCY)
 *   --detach     : spawn daemon as background process and exit
 *
 * SIESA_QUEUE_TICK_MS controls tick interval (default 5000 ms per AC #1).
 */

const os   = require('node:os');
const path = require('node:path');
const fs   = require('node:fs');
const { spawn } = require('node:child_process');

const QUEUE_HOME      = process.env.SIESA_QUEUE_HOME || path.join(os.homedir(), '.siesa-queue');
const DISPATCHER_PATH = path.join(__dirname, '../../runtime/dispatcher.js');
const STALE_S         = parseInt(process.env.SIESA_QUEUE_HEARTBEAT_STALE_S || '180', 10);

/**
 * Returns true if a live daemon is already registered in the heartbeat table.
 */
function isLiveDaemonRunning() {
  const dbPath = path.join(QUEUE_HOME, 'queue.db');
  if (!fs.existsSync(dbPath)) return false;
  try {
    const { openDb } = require('../../lib/db');
    const db  = openDb(dbPath);
    const row = db.prepare('SELECT pid, last_beat_ts FROM daemon_heartbeat WHERE id=1').get();
    db.close();
    if (!row) return false;
    const age = Math.floor(Date.now() / 1000) - row.last_beat_ts;
    if (age > STALE_S) return false;
    // Verify the process is actually alive
    try { process.kill(row.pid, 0); return true; } catch { return false; }
  } catch { return false; }
}

async function handler(argv) {
  // Ensure queue home exists
  fs.mkdirSync(QUEUE_HOME, { recursive: true });

  // Guard against duplicate daemons
  if (isLiveDaemonRunning()) {
    console.error('A dispatcher is already running (heartbeat is fresh). Use `queue health` to inspect.');
    process.exit(1);
  }

  // Apply CLI options to env before loading dispatcher
  if (argv.verbose) {
    process.env.SIESA_QUEUE_LOG_LEVEL = 'debug';
  }
  if (argv.concurrency != null) {
    process.env.SIESA_QUEUE_CONCURRENCY = String(argv.concurrency);
    process.env.SIESA_QUEUE_MAX_CONCURRENCY = String(argv.concurrency);
  }

  if (argv.detach) {
    const logPath = path.join(QUEUE_HOME, 'daemon.log');
    const logFd   = fs.openSync(logPath, 'a');

    const childEnv = {
      ...process.env,
      SIESA_QUEUE_HOME:    QUEUE_HOME,
      SIESA_PROJECT_ROOT:  process.env.SIESA_PROJECT_ROOT || process.cwd(),
    };
    if (argv.verbose)     childEnv.SIESA_QUEUE_LOG_LEVEL   = 'debug';
    if (argv.concurrency) childEnv.SIESA_QUEUE_CONCURRENCY = String(argv.concurrency);

    const child = spawn(process.execPath, [DISPATCHER_PATH], {
      detached: true,
      stdio:    ['ignore', logFd, logFd],
      env:      childEnv,
      cwd:      process.env.SIESA_PROJECT_ROOT || process.cwd(),
    });

    child.unref();
    fs.closeSync(logFd);

    console.log(`Dispatcher started (pid ${child.pid})`);
    console.log(`Logs: ${logPath}`);
  } else {
    // Foreground (--foreground is the default mode): run dispatcher in current process
    require('../../runtime/dispatcher');
  }
}

module.exports = {
  command: 'start',
  describe: 'Start the queue dispatcher daemon',
  builder: (yargs) =>
    yargs
      .option('foreground', {
        type:        'boolean',
        description: 'Run dispatcher in foreground (default when --detach is not set)',
        default:     true,
      })
      .option('detach', {
        type:        'boolean',
        description: 'Run as background detached process',
        default:     false,
      })
      .option('verbose', {
        alias:       'v',
        type:        'boolean',
        description: 'Enable debug/verbose logging (sets SIESA_QUEUE_LOG_LEVEL=debug)',
        default:     false,
      })
      .option('concurrency', {
        type:        'number',
        description: 'Max concurrent workers (default: 1 per SIESA_QUEUE_MAX_CONCURRENCY)',
        default:     undefined,
      }),
  handler,
};
