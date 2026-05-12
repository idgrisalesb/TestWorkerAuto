'use strict';

const os = require('node:os');
const path = require('node:path');

const { openDb }   = require('../../lib/db');
const { formatTs } = require('../../lib/format');

/**
 * Alias for formatTs — used in table rendering.
 * @param {number|null} epochSec
 * @returns {string}
 */
const fmtTs = formatTs;

/**
 * Truncate a string to maxLen.
 * @param {string|null} str
 * @param {number} maxLen
 * @returns {string}
 */
function trunc(str, maxLen) {
  if (!str) return '-';
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}

async function handler(argv) {
  const queueHome = process.env.SIESA_QUEUE_HOME || path.join(os.homedir(), '.siesa-queue');
  const dbPath = path.join(queueHome, 'queue.db');
  const db = openDb(dbPath);

  let query = 'SELECT id, type, state, priority, model_override, correlation_key, payload_json, created_at FROM jobs';
  const params = [];

  if (argv.state) {
    query += ' WHERE state = ?';
    params.push(argv.state);
  }

  query += ' ORDER BY priority ASC, id ASC';

  const rows = db.prepare(query).all(...params);
  db.close();

  if (rows.length === 0) {
    console.log('No jobs found.');
    return;
  }

  // Column widths
  const COL = {
    id:        4,
    type:      12,
    story:     14,
    state:     20,
    priority:  8,
    model:     8,
    created:   17,
  };

  const header = [
    'ID'.padEnd(COL.id),
    'TYPE'.padEnd(COL.type),
    'STORY/PROMPT'.padEnd(COL.story),
    'STATE'.padEnd(COL.state),
    'PRI'.padStart(COL.priority),
    'MODEL'.padEnd(COL.model),
    'CREATED'.padEnd(COL.created),
  ].join('  ');

  const sep = '-'.repeat(header.length);
  console.log(header);
  console.log(sep);

  for (const row of rows) {
    let storyOrPrompt = '-';
    try {
      const payload = JSON.parse(row.payload_json);
      storyOrPrompt = payload.story_id || trunc(payload.prompt, COL.story) || '-';
    } catch {
      // ignore parse error
    }

    const line = [
      String(row.id).padEnd(COL.id),
      trunc(row.type, COL.type).padEnd(COL.type),
      trunc(storyOrPrompt, COL.story).padEnd(COL.story),
      trunc(row.state, COL.state).padEnd(COL.state),
      String(row.priority).padStart(COL.priority),
      trunc(row.model_override || '-', COL.model).padEnd(COL.model),
      fmtTs(row.created_at).padEnd(COL.created),
    ].join('  ');

    console.log(line);
  }
}

module.exports = {
  command: 'list',
  describe: 'List jobs in the queue',
  builder: (yargs) =>
    yargs.option('state', {
      type: 'string',
      description: 'Filter by state (pending|claimed|running|succeeded|failed|waiting_rate_limit|cancelled)',
    }),
  handler,
};
