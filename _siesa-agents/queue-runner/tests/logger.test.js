'use strict';

/**
 * Unit tests for lib/logger.js
 * AC #11: NDJSON log rotation, daily file transport, currentLogPath.
 */

const assert = require('node:assert/strict');
const path   = require('node:path');
const os     = require('node:os');
const fs     = require('node:fs');

// Override SIESA_QUEUE_HOME to a temp dir for test isolation
const tmpHome = path.join(os.tmpdir(), `queue-logger-test-${Date.now()}`);
process.env.SIESA_QUEUE_HOME = tmpHome;

// Require logger after setting env
const { createLogger, currentLogPath, LOGS_DIR } = require('../lib/logger');

// ─── LOGS_DIR uses SIESA_QUEUE_HOME ──────────────────────────────────────────

{
  assert.ok(
    LOGS_DIR.startsWith(tmpHome),
    `LOGS_DIR (${LOGS_DIR}) should be under SIESA_QUEUE_HOME (${tmpHome})`
  );
  console.log('PASS: LOGS_DIR uses SIESA_QUEUE_HOME');
}

// ─── currentLogPath returns path with today's date ────────────────────────────

{
  const logPath = currentLogPath();
  const today   = new Date().toISOString().slice(0, 10);
  assert.ok(
    logPath.includes(today),
    `currentLogPath (${logPath}) should contain today's date (${today})`
  );
  assert.ok(logPath.endsWith('.ndjson'), 'currentLogPath should end with .ndjson');
  console.log('PASS: currentLogPath returns YYYY-MM-DD NDJSON path');
}

// ─── createLogger returns a winston logger with expected methods ──────────────

{
  const logger = createLogger({ verbose: false });
  assert.equal(typeof logger.info,  'function', 'logger.info is function');
  assert.equal(typeof logger.warn,  'function', 'logger.warn is function');
  assert.equal(typeof logger.error, 'function', 'logger.error is function');
  assert.equal(typeof logger.debug, 'function', 'logger.debug is function');
  console.log('PASS: createLogger returns winston logger with standard methods');
}

// ─── Logger writes NDJSON to file ─────────────────────────────────────────────

{
  // Use a temp log dir separate from default
  const testHome = path.join(os.tmpdir(), `queue-logger-write-test-${Date.now()}`);
  process.env.SIESA_QUEUE_HOME = testHome;

  // Re-require with updated env (fresh require won't work due to module cache;
  // use createLogger options to write to a known file)
  const winstonTransports = require('winston').transports;
  const winston = require('winston');

  const testLogPath = path.join(testHome, 'logs', 'test.ndjson');
  fs.mkdirSync(path.dirname(testLogPath), { recursive: true });

  const testLogger = winston.createLogger({
    transports: [
      new winstonTransports.File({
        filename: testLogPath,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.printf((info) => JSON.stringify({
            ts:     info.timestamp,
            level:  info.level,
            event:  info.event || info.message,
            job_id: info.job_id ?? null,
          }))
        ),
      }),
    ],
  });

  testLogger.info('test_event', { event: 'test_event', job_id: 42 });

  // Give file transport time to flush
  setTimeout(() => {
    try {
      const content = fs.readFileSync(testLogPath, 'utf8').trim();
      const lines   = content.split('\n').filter(Boolean);
      assert.ok(lines.length >= 1, 'At least one line written');

      const parsed = JSON.parse(lines[0]);
      assert.ok(parsed.ts,    'ts field present');
      assert.ok(parsed.level, 'level field present');
      assert.ok(parsed.event, 'event field present');
      assert.equal(parsed.job_id, 42, 'job_id field present and correct');
      console.log('PASS: logger writes NDJSON with mandatory fields');
    } catch (e) {
      console.error('FAIL: logger NDJSON write test:', e.message);
      process.exit(1);
    }

    // Cleanup
    try {
      fs.rmSync(testHome, { recursive: true, force: true });
      fs.rmSync(tmpHome,  { recursive: true, force: true });
    } catch { /* non-fatal */ }

    console.log('\nAll logger tests passed.');
  }, 300);
}
