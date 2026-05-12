'use strict';

/**
 * Unit tests for lib/format.js (AC #9)
 */

const assert = require('node:assert/strict');
const { formatTs, formatDuration } = require('../lib/format');

// ─── formatTs ─────────────────────────────────────────────────────────────────

{
  // formatTs should return a non-empty string for a valid epoch
  const result = formatTs(1715190000);
  assert.ok(typeof result === 'string' && result.length > 0, 'formatTs should return a non-empty string');
  // Should not contain the raw epoch number
  assert.ok(!result.includes('1715190000'), 'formatTs should not return raw epoch digits');
  console.log(`PASS: formatTs(1715190000) = "${result}"`);
}

{
  assert.equal(formatTs(null),      '-', 'formatTs(null) should return "-"');
  assert.equal(formatTs(0),         '-', 'formatTs(0) should return "-"');
  assert.equal(formatTs(undefined), '-', 'formatTs(undefined) should return "-"');
  console.log('PASS: formatTs handles null/zero/undefined');
}

// ─── formatDuration ───────────────────────────────────────────────────────────

{
  assert.equal(formatDuration(null),     '-',       'null → "-"');
  assert.equal(formatDuration(undefined),'-',       'undefined → "-"');
  assert.equal(formatDuration(-1),       '-',       'negative → "-"');
  assert.equal(formatDuration(500),      '500ms',   '< 1s → ms');
  assert.equal(formatDuration(1000),     '1s',      '1000ms → 1s');
  assert.equal(formatDuration(65000),    '1m 5s',   '65s → 1m 5s');
  assert.equal(formatDuration(3661000),  '1h 1m 1s','3661s → 1h 1m 1s');
  assert.equal(formatDuration(7200000),  '2h 0m 0s','2h → 2h 0m 0s');
  console.log('PASS: formatDuration all cases');
}

console.log('\nAll format tests passed.');
