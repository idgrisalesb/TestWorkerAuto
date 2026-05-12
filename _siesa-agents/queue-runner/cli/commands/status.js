'use strict';

const os   = require('node:os');
const path = require('node:path');

const { openDb }        = require('../../lib/db');
const { formatTs, formatDuration } = require('../../lib/format');

async function handler(argv) {
  const queueHome = process.env.SIESA_QUEUE_HOME || path.join(os.homedir(), '.siesa-queue');
  const dbPath    = path.join(queueHome, 'queue.db');
  const db        = openDb(dbPath);

  // Query 1: jobs by state
  const jobRows = db
    .prepare('SELECT state, COUNT(*) AS count FROM jobs GROUP BY state ORDER BY state')
    .all();

  // Query 2: cost today by model
  const costTodayRows = db
    .prepare(`
      SELECT model, SUM(cost_usd) AS total
      FROM cost_ledger
      WHERE date(ts, 'unixepoch') = date('now', 'utc')
      GROUP BY model
      ORDER BY model
    `)
    .all();

  // Query 3: grand total cost
  const grandTotalRow = db
    .prepare('SELECT SUM(cost_usd) AS grand_total FROM cost_ledger')
    .get();

  // Query 4: next rate-limit reset
  const rlRow = db
    .prepare('SELECT MIN(reset_ts) AS next_reset FROM rate_limit_windows WHERE closed_at IS NULL')
    .get();

  // Query 5: daemon heartbeat
  const hbRow = db
    .prepare('SELECT last_beat_ts, pid, in_flight FROM daemon_heartbeat WHERE id = 1')
    .get();

  db.close();

  const nowSec       = Math.floor(Date.now() / 1000);
  const grandTotal   = grandTotalRow ? (grandTotalRow.grand_total || 0) : 0;
  const nextResetTs  = rlRow ? rlRow.next_reset : null;
  const heartbeatAgeS = hbRow ? (nowSec - hbRow.last_beat_ts) : null;

  if (argv.json) {
    // AC #7: JSON output to stdout
    const jobs_by_state = {};
    for (const r of jobRows) jobs_by_state[r.state] = r.count;

    const cost_today = {};
    for (const r of costTodayRows) cost_today[r.model] = r.total;

    const snapshot = {
      jobs_by_state,
      cost_today,
      grand_total:      grandTotal,
      next_reset_ts:    nextResetTs || null,
      heartbeat_age_s:  heartbeatAgeS,
    };
    process.stdout.write(JSON.stringify(snapshot) + '\n');
    return;
  }

  // ── ASCII table ──────────────────────────────────────────────────────────────

  if (jobRows.length === 0) {
    console.log('Queue is empty.');
  } else {
    const COL_STATE = 26;
    const COL_COUNT = 8;
    const header = 'ESTADO'.padEnd(COL_STATE) + 'JOBS'.padStart(COL_COUNT);
    const sep    = '-'.repeat(COL_STATE + COL_COUNT);

    console.log('\n=== Estado de la Cola ===');
    console.log(header);
    console.log(sep);

    let total = 0;
    for (const row of jobRows) {
      console.log(String(row.state).padEnd(COL_STATE) + String(row.count).padStart(COL_COUNT));
      total += row.count;
    }

    console.log(sep);
    console.log('TOTAL'.padEnd(COL_STATE) + String(total).padStart(COL_COUNT));
  }

  // ── Cost today ───────────────────────────────────────────────────────────────

  console.log('\n=== Costo Hoy (USD) ===');
  if (costTodayRows.length === 0) {
    console.log('  Sin registros hoy.');
  } else {
    const COL_MODEL = 20;
    const COL_COST  = 14;
    console.log('MODELO'.padEnd(COL_MODEL) + 'COSTO USD'.padStart(COL_COST));
    console.log('-'.repeat(COL_MODEL + COL_COST));
    for (const r of costTodayRows) {
      console.log(String(r.model).padEnd(COL_MODEL) + `$${(r.total || 0).toFixed(6)}`.padStart(COL_COST));
    }
  }

  console.log(`\n  Total acumulado : $${grandTotal.toFixed(6)}`);

  // ── Rate-limit info ──────────────────────────────────────────────────────────

  if (nextResetTs) {
    console.log(`  Próximo reset   : ${formatTs(nextResetTs)}`);
  }

  // ── Daemon heartbeat ─────────────────────────────────────────────────────────

  console.log('\n=== Daemon ===');
  if (!hbRow) {
    console.log('  Daemon no activo (sin heartbeat).');
  } else {
    const ageStr = heartbeatAgeS != null
      ? formatDuration(heartbeatAgeS * 1000)
      : '-';
    console.log(`  PID        : ${hbRow.pid}`);
    console.log(`  En vuelo   : ${hbRow.in_flight}`);
    console.log(`  Heartbeat  : hace ${ageStr}`);
  }

  console.log('');
}

module.exports = {
  command:  'status',
  describe: 'Show queue status: jobs by state, cost breakdown, next reset, daemon heartbeat',
  builder:  (yargs) =>
    yargs.option('json', {
      type:        'boolean',
      description: 'Output snapshot as JSON to stdout',
      default:     false,
    }),
  handler,
};
