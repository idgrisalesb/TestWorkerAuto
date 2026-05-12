'use strict';

/**
 * CLI handler for `queue sessions` subcommand.
 * Subcommands:
 *   prune --older-than <N>d|<N>h  — marks abandoned=1 on stale sessions (AC #8)
 */

const os       = require('node:os');
const path     = require('node:path');
const readline = require('node:readline');

const { openDb }                    = require('../../lib/db');
const { pruneStats, markAbandoned } = require('../../lib/sessions');

/**
 * Parse an "--older-than" value like "30d" or "12h" into seconds.
 * @param {string} raw - e.g. "30d" or "12h"
 * @returns {number} seconds
 * @throws {Error} if format is invalid
 */
function parseOlderThan(raw) {
  const match = /^(\d+)(d|h)$/.exec(raw);
  if (!match) {
    throw new Error(`Invalid --older-than format "${raw}". Use <N>d or <N>h (e.g. 30d, 12h).`);
  }
  const n    = parseInt(match[1], 10);
  const unit = match[2];
  return unit === 'd' ? n * 86400 : n * 3600;
}

/**
 * Prompt the user for confirmation via readline.
 * Resolves true if user types "y" or "Y", false otherwise.
 * @param {string} question
 * @returns {Promise<boolean>}
 */
function confirm(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input:  process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

// ─── prune handler ───────────────────────────────────────────────────────────

async function pruneHandler(argv) {
  const queueHome = process.env.SIESA_QUEUE_HOME || path.join(os.homedir(), '.siesa-queue');
  const dbPath    = path.join(queueHome, 'queue.db');
  const db        = openDb(dbPath);

  let olderThanS;
  try {
    olderThanS = parseOlderThan(argv.olderThan);
  } catch (err) {
    console.error(err.message);
    db.close();
    process.exit(1);
  }

  const count = pruneStats(db, olderThanS);

  if (count === 0) {
    console.log(`No hay sesiones más antiguas de ${argv.olderThan} para marcar como abandonadas.`);
    db.close();
    return;
  }

  console.log(`Se marcarán como abandonadas ${count} sesión(es) con last_used_at anterior a ${argv.olderThan}.`);

  const ok = await confirm('¿Continuar? [y/N] ');
  if (!ok) {
    console.log('Operación cancelada.');
    db.close();
    return;
  }

  const affected = markAbandoned(db, olderThanS);
  console.log(`${affected} sesión(es) marcada(s) como abandonadas.`);
  db.close();
}

// ─── sessions command builder ─────────────────────────────────────────────────

module.exports = {
  command:  'sessions <action>',
  describe: 'Manage Claude sessions',
  builder:  (yargs) =>
    yargs.command({
      command:  'prune',
      describe: 'Mark stale sessions as abandoned (sets abandoned=1)',
      builder:  (y) =>
        y.option('older-than', {
          alias:       'olderThan',
          type:        'string',
          description: 'Age threshold: <N>d (days) or <N>h (hours). E.g. 30d, 12h',
          demandOption: true,
        }),
      handler: pruneHandler,
    }),
  handler: () => {}, // subcommand router; top-level no-op
};
