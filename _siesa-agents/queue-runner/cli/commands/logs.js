'use strict';

const os   = require('node:os');
const path = require('node:path');
const fs   = require('node:fs');

const { openDb } = require('../../lib/db');

function getTodayLogPath(queueHome) {
  const d    = new Date();
  const date = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
  return path.join(queueHome, 'logs', `queue-${date}.ndjson`);
}

function formatLine(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const obj   = JSON.parse(trimmed);
    // ts can be ISO string ("2024-01-15T10:30:00.000Z") or epoch seconds (number)
    const tsDate = obj.ts
      ? (typeof obj.ts === 'number' ? new Date(obj.ts * 1000) : new Date(obj.ts))
      : null;
    const ts = tsDate && !isNaN(tsDate) ? tsDate.toLocaleTimeString() : '??:??:??';
    const level = (obj.level || 'info').toUpperCase().padEnd(5);
    const event = obj.event || '';
    const rest  = { ...obj };
    delete rest.ts; delete rest.level; delete rest.event;
    const restStr = Object.keys(rest).length ? ' ' + JSON.stringify(rest) : '';
    return `[${ts}] ${level} ${event}${restStr}`;
  } catch {
    return trimmed;
  }
}

function printFile(filePath, maxLines) {
  if (!fs.existsSync(filePath)) return 0;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines   = content.split('\n').filter(Boolean);
  const toShow  = maxLines > 0 ? lines.slice(-maxLines) : lines;
  toShow.forEach((l) => { const f = formatLine(l); if (f) console.log(f); });
  return fs.statSync(filePath).size;
}

function followFile(filePath, initialLines) {
  let offset = printFile(filePath, initialLines);
  process.stderr.write(`Following ${filePath} — Ctrl+C to stop\n`);

  fs.watchFile(filePath, { interval: 500, persistent: true }, (curr) => {
    if (curr.size <= offset) return;
    const fd  = fs.openSync(filePath, 'r');
    const len = curr.size - offset;
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, offset);
    fs.closeSync(fd);
    offset = curr.size;
    buf.toString('utf8').split('\n').forEach((l) => {
      const f = formatLine(l);
      if (f) console.log(f);
    });
  });

  process.on('SIGINT', () => { fs.unwatchFile(filePath); process.exit(0); });
}

function resolveLogPath(queueHome) {
  const today = getTodayLogPath(queueHome);
  if (fs.existsSync(today)) return today;

  // Fall back to most recent log file
  const logsDir = path.join(queueHome, 'logs');
  let files = [];
  try {
    files = fs.readdirSync(logsDir)
      .filter((f) => /^queue-\d{4}-\d{2}-\d{2}\.ndjson$/.test(f))
      .sort()
      .reverse();
  } catch {}

  if (files.length === 0) return null;
  return path.join(logsDir, files[0]);
}

async function handler(argv) {
  const queueHome = process.env.SIESA_QUEUE_HOME || path.join(os.homedir(), '.siesa-queue');

  // --job: show events for a specific job from the DB
  if (argv.job != null) {
    const db   = openDb(path.join(queueHome, 'queue.db'));
    const rows = db.prepare(`
      SELECT e.ts, e.level, e.event, e.payload,
             r.attempt_number
      FROM events e
      LEFT JOIN runs r ON e.run_id = r.id
      WHERE e.job_id = ?
      ORDER BY e.id
    `).all(argv.job);
    db.close();

    if (rows.length === 0) {
      console.log(`No events found for job ${argv.job}.`);
      return;
    }
    for (const row of rows) {
      let payload = {};
      try { payload = JSON.parse(row.payload || '{}'); } catch {}
      const f = formatLine(JSON.stringify({
        ts: row.ts,
        level: row.level || 'info',
        event: row.event,
        ...(row.attempt_number != null ? { attempt: row.attempt_number } : {}),
        ...payload,
      }));
      if (f) console.log(f);
    }
    return;
  }

  // File-based logs
  const logPath = resolveLogPath(queueHome);
  if (!logPath) {
    console.error(`No logs found in ${path.join(queueHome, 'logs')}. Has the daemon run yet?`);
    process.exit(1);
  }

  if (argv.follow) {
    followFile(logPath, argv.lines);
  } else {
    printFile(logPath, argv.lines);
  }
}

module.exports = {
  command: 'logs',
  describe: 'Show or follow queue daemon logs',
  builder: (yargs) =>
    yargs
      .option('follow', {
        alias:   'f',
        type:    'boolean',
        description: 'Stream new log lines as they arrive (like tail -f)',
        default: false,
      })
      .option('job', {
        alias:   'j',
        type:    'number',
        description: 'Show events for a specific job ID (from DB)',
      })
      .option('lines', {
        alias:   'n',
        type:    'number',
        description: 'Number of recent lines to show',
        default: 50,
      }),
  handler,
};
