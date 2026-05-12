'use strict';

/**
 * Winston logger for the queue daemon.
 *
 * AC #11:
 *   - Writes NDJSON to $SIESA_QUEUE_HOME/logs/queue-YYYY-MM-DD.ndjson
 *   - Daily rotation, maxFiles=14, gzip compressed
 *   - Optional Console transport when SIESA_QUEUE_LOG_LEVEL=debug or --verbose
 *
 * NDJSON fields per strategy §10.1:
 *   ts, level, event, job_id (mandatory)
 */

const os      = require('node:os');
const path    = require('node:path');
const fs      = require('node:fs');
const winston = require('winston');

let _dailyRotateFile;
try {
  _dailyRotateFile = require('winston-daily-rotate-file');
} catch {
  _dailyRotateFile = null;
}

const QUEUE_HOME = process.env.SIESA_QUEUE_HOME || path.join(os.homedir(), '.siesa-queue');
const LOGS_DIR   = path.join(QUEUE_HOME, 'logs');

// Ensure logs directory exists
try {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
} catch {
  // Non-fatal — logger will fail gracefully
}

/**
 * Resolve desired log level.
 * Verbose flag takes precedence, then env var, then default 'info'.
 * @param {boolean} verbose
 * @returns {string}
 */
function resolveLevel(verbose) {
  if (verbose) return 'debug';
  const envLevel = (process.env.SIESA_QUEUE_LOG_LEVEL || '').toLowerCase();
  if (['debug', 'info', 'warn', 'error'].includes(envLevel)) return envLevel;
  return 'info';
}

/**
 * NDJSON format: each log line is a single JSON object with mandatory fields.
 * ts       - ISO timestamp
 * level    - log level
 * event    - structured event name (from meta.event or message)
 * job_id   - job identifier (from meta.job_id, or null)
 */
const ndjsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const entry = {
      ts:     timestamp,
      level,
      event:  meta.event || message || 'log',
      job_id: meta.job_id ?? null,
      ...Object.fromEntries(
        Object.entries(meta).filter(([k]) => !['event', 'job_id'].includes(k))
      ),
    };
    return JSON.stringify(entry);
  })
);

/**
 * Create and return a configured winston logger instance.
 *
 * @param {object} [opts]
 * @param {boolean} [opts.verbose=false] - Enable console transport with debug level.
 * @returns {import('winston').Logger}
 */
function createLogger(opts = {}) {
  const verbose  = Boolean(opts.verbose);
  const level    = resolveLevel(verbose);
  const transports = [];

  // Primary: daily-rotating NDJSON file
  if (_dailyRotateFile) {
    transports.push(
      new _dailyRotateFile({
        dirname:       LOGS_DIR,
        filename:      'queue-%DATE%.ndjson',
        datePattern:   'YYYY-MM-DD',
        maxFiles:      '14d',
        zippedArchive: true,
        format:        ndjsonFormat,
        level,
      })
    );
  } else {
    // Fallback: plain file transport
    transports.push(
      new winston.transports.File({
        filename: path.join(LOGS_DIR, `queue-${new Date().toISOString().slice(0, 10)}.ndjson`),
        format:   ndjsonFormat,
        level,
      })
    );
  }

  // Optional console transport (debug/verbose mode)
  if (verbose || (process.env.SIESA_QUEUE_LOG_LEVEL || '').toLowerCase() === 'debug') {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
        level: 'debug',
      })
    );
  }

  return winston.createLogger({
    level,
    transports,
    exitOnError: false,
  });
}

/**
 * Get the log file path for the current day.
 * Used by runs.raw_log_path (AC #11).
 * @returns {string}
 */
function currentLogPath() {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(LOGS_DIR, `queue-${date}.ndjson`);
}

/**
 * Singleton logger instance (verbose=false by default).
 * Re-create via createLogger({ verbose: true }) when CLI passes --verbose.
 */
const logger = createLogger({ verbose: false });

module.exports = { createLogger, currentLogPath, logger, LOGS_DIR };
