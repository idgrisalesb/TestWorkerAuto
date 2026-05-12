'use strict';

const os   = require('node:os');
const path = require('node:path');

const { openDb } = require('../../lib/db');

// sqlite3 dot-commands mapped to equivalent SQL
const DOT_COMMANDS = {
  '.tables': "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
  '.schema': "SELECT sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY type, name",
};

async function handler(argv) {
  const queueHome = process.env.SIESA_QUEUE_HOME || path.join(os.homedir(), '.siesa-queue');
  const dbPath    = path.join(queueHome, 'queue.db');

  let sql = argv.sql.trim();

  if (DOT_COMMANDS[sql]) {
    sql = DOT_COMMANDS[sql];
  }

  const db = openDb(dbPath);

  try {
    if (/^\s*(select|pragma|with|explain)/i.test(sql)) {
      const rows = db.prepare(sql).all();
      if (argv.json) {
        console.log(JSON.stringify(rows, null, 2));
        return;
      }
      for (const row of rows) {
        const vals = Object.values(row);
        // Single value → bare output (matches sqlite3 CLI default behavior)
        console.log(vals.length === 1 ? String(vals[0]) : vals.map(String).join('|'));
      }
    } else {
      const info = db.prepare(sql).run();
      console.log(`changes: ${info.changes}`);
    }
  } finally {
    db.close();
  }
}

module.exports = {
  command: 'db <sql>',
  describe: 'Run a raw SQL query against the queue database (no sqlite3 CLI required)',
  builder: (yargs) =>
    yargs
      .positional('sql', {
        type: 'string',
        description: 'SQL statement or dot-command (.tables, .schema)',
      })
      .option('json', {
        type: 'boolean',
        default: false,
        description: 'Output results as JSON array',
      }),
  handler,
};
