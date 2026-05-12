'use strict';

/**
 * `queue config <subcommand>` — runtime configuration commands.
 *
 * Subcommands:
 *   reload-patterns  — hot-reload rate-limit-patterns.json without restarting the daemon.
 *                      Sends SIGUSR1 on Linux/macOS or writes a flag file on Windows.
 *   set <key> <value> — set a runtime config value (paused true|false, concurrency N).
 */

const os   = require('node:os');
const path = require('node:path');
const fs   = require('node:fs');

const { openDb } = require('../../lib/db');

const QUEUE_HOME    = process.env.SIESA_QUEUE_HOME || path.join(os.homedir(), '.siesa-queue');
const FLAG_FILE     = path.join(QUEUE_HOME, '.reload-patterns');

/**
 * Prerequisite checklist for N>1 concurrency (AC #1).
 */
const CONCURRENCY_PREREQUISITES_WARNING = `
WARNING: Enabling N>1 parallel Workers requires these prerequisites:
  (a) BMAD workflow output files are isolated per story (no concurrent writes to sprint-status.yaml
      from multiple Workers). Verify that all active jobs use distinct correlation_keys.
  (b) You have sufficient Anthropic API quota to support N simultaneous Workers.
  (c) All queued jobs have distinct correlation_keys (no two jobs share the same key).

Failure to meet these prerequisites can cause race conditions in BMAD project files
and duplicate API costs.

To confirm you have verified the prerequisites, re-run with --i-understand-the-risks.
`;

async function reloadPatternsHandler() {
  const dbPath = path.join(QUEUE_HOME, 'queue.db');

  let db;
  try {
    db = openDb(dbPath);
  } catch {
    console.error('Error: queue database not found. Is the daemon running?');
    process.exit(1);
  }

  const row = db.prepare('SELECT pid FROM daemon_heartbeat WHERE id=1').get();
  db.close();

  if (!row) {
    console.error('Error: no daemon registered in daemon_heartbeat.');
    process.exit(1);
  }

  const isWindows = process.platform === 'win32';

  if (isWindows) {
    // Windows: write flag file; dispatcher checks on next tick
    fs.writeFileSync(FLAG_FILE, String(Date.now()));
    console.log(`Flag file written: ${FLAG_FILE}`);
    console.log('Daemon will reload patterns on its next tick.');
  } else {
    // Linux/macOS: send SIGUSR1
    try {
      process.kill(row.pid, 'SIGUSR1');
      console.log(`SIGUSR1 sent to daemon pid ${row.pid}`);
      console.log('Daemon will reload rate-limit patterns.');
    } catch (err) {
      console.error(`Error sending SIGUSR1 to pid ${row.pid}: ${err.message}`);
      process.exit(1);
    }
  }
}

function setConfigHandler(argv) {
  const key   = argv.key;
  const value = argv.value;

  const SUPPORTED_KEYS = ['paused', 'concurrency'];
  if (!SUPPORTED_KEYS.includes(key)) {
    console.error(`Error: unknown config key "${key}". Supported: ${SUPPORTED_KEYS.join(', ')}`);
    process.exit(1);
  }

  const dbPath = path.join(QUEUE_HOME, 'queue.db');
  let db;
  try {
    db = openDb(dbPath);
  } catch {
    console.error('Error: queue database not found. Run `queue init` first.');
    process.exit(1);
  }

  const now = Math.floor(Date.now() / 1000);

  if (key === 'paused') {
    const normalised = String(value).toLowerCase();
    if (normalised !== 'true' && normalised !== 'false') {
      console.error(`Error: value for "paused" must be true or false`);
      db.close();
      process.exit(1);
    }
    const newPaused = normalised === 'true';

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
    console.log(`paused set to ${newPaused} (manual). Daemon will pick up the change on next budget-check tick.`);
    return;
  }

  if (key === 'concurrency') {
    const n = parseInt(String(value), 10);
    if (!Number.isInteger(n) || n < 1) {
      console.error(`Error: concurrency must be a positive integer, got "${value}"`);
      db.close();
      process.exit(1);
    }

    // AC #2: N=1 → silent; N>1 → require --i-understand-the-risks; N>3 → also require --force
    if (n > 3 && !argv.force) {
      console.error(`Error: concurrency > 3 requires --force (maximum recommended is 3).`);
      db.close();
      process.exit(1);
    }
    if (n > 1 && !argv['i-understand-the-risks']) {
      process.stderr.write(CONCURRENCY_PREREQUISITES_WARNING);
      db.close();
      process.exit(1);
    }

    try {
      db.prepare(`
        UPDATE daemon_config SET concurrency=?, updated_at=? WHERE id=1
      `).run(n, now);
    } catch (err) {
      console.error(`Error updating daemon_config: ${err.message}`);
      db.close();
      process.exit(1);
    }
    db.close();
    console.log(`concurrency set to ${n}. Daemon will pick up the change on next tick.`);
    return;
  }
}

module.exports = {
  command: 'config <subcommand>',
  describe: 'Runtime configuration commands',
  builder: (yargs) =>
    yargs
      .command({
        command:  'reload-patterns',
        describe: 'Hot-reload rate-limit-patterns.json without restarting the daemon',
        handler:  reloadPatternsHandler,
      })
      .command({
        command:  'set <key> <value>',
        describe: 'Set a runtime config value (paused true|false, concurrency N)',
        builder:  (y) => y
          .positional('key',   { type: 'string', describe: 'Config key (paused, concurrency)' })
          .positional('value', { type: 'string', describe: 'Value to set' })
          .option('i-understand-the-risks', {
            type:     'boolean',
            default:  false,
            describe: 'Required when setting concurrency > 1 (confirms prerequisites are met)',
          })
          .option('force', {
            type:     'boolean',
            default:  false,
            describe: 'Required when setting concurrency > 3',
          }),
        handler:  setConfigHandler,
      })
      .demandCommand(1, 'Specify a subcommand: reload-patterns, set'),
  handler: () => {},
};
