'use strict';

/**
 * Unit tests for lib/rate-limit.js
 * Covers: loadPatterns, detectRateLimit, extractResetTs, calcBackoff (AC #1, #2, #3, #8)
 */

const assert = require('node:assert/strict');
const path   = require('node:path');

const {
  loadPatterns,
  detectRateLimit,
  extractResetTs,
  calcBackoff,
  DEFAULT_BY_CATEGORY,
} = require('../lib/rate-limit');

const PATTERNS_PATH = path.join(__dirname, '../config/rate-limit-patterns.json');

// ─── loadPatterns ─────────────────────────────────────────────────────────────

{
  const patterns = loadPatterns(PATTERNS_PATH);
  assert.equal(patterns.length, 8, 'Should load 8 patterns from config');
  for (const p of patterns) {
    assert.ok(p.id,         `Pattern ${p.id} must have an id`);
    assert.ok(p.compiledRe instanceof RegExp, `Pattern ${p.id} must have a compiledRe`);
    assert.ok(p.category,   `Pattern ${p.id} must have a category`);
  }
  console.log('PASS: loadPatterns loads 8 patterns with compiledRe');
}

// ─── detectRateLimit — basic matches ─────────────────────────────────────────

{
  const patterns = loadPatterns(PATTERNS_PATH);

  // claude_usage_limit
  const r1 = detectRateLimit('Claude usage limit reached, please wait', patterns, 'result');
  assert.equal(r1.matched, true, 'Should match claude_usage_limit');
  assert.equal(r1.category, 'plan_exhaustion');

  // rate_limit_error
  const r2 = detectRateLimit('rate-limit-error occurred', patterns, 'stderr');
  assert.equal(r2.matched, true, 'Should match rate_limit_error');
  assert.equal(r2.category, 'transient');

  // too_many_requests
  const r3 = detectRateLimit('Too many requests from this IP', patterns, 'stderr');
  assert.equal(r3.matched, true, 'Should match too_many_requests');

  // credit_low
  const r4 = detectRateLimit('Your credit balance is too low to perform this action', patterns, 'result');
  assert.equal(r4.matched, true, 'Should match credit_low');
  assert.equal(r4.category, 'billing_block');

  // no match
  const r5 = detectRateLimit('Everything is working fine', patterns, 'result');
  assert.equal(r5.matched, false, 'Should not match benign text');

  console.log('PASS: detectRateLimit basic pattern matching');
}

// ─── detectRateLimit — source=text_delta must be ignored ─────────────────────

{
  const patterns = loadPatterns(PATTERNS_PATH);

  const r = detectRateLimit('Claude usage limit reached', patterns, 'text_delta');
  assert.equal(r.matched, false, 'text_delta source must never match (false positive prevention)');
  console.log('PASS: detectRateLimit ignores text_delta source');
}

// ─── detectRateLimit — null/empty text ───────────────────────────────────────

{
  const patterns = loadPatterns(PATTERNS_PATH);

  assert.equal(detectRateLimit(null,      patterns, 'result').matched, false);
  assert.equal(detectRateLimit('',        patterns, 'result').matched, false);
  assert.equal(detectRateLimit(undefined, patterns, 'result').matched, false);
  console.log('PASS: detectRateLimit handles null/empty text');
}

// ─── extractResetTs — extract=epoch (10-digit) ────────────────────────────────

{
  const patterns = loadPatterns(PATTERNS_PATH);
  // Use text that matches the reset_at_epoch pattern: reset_at: <10-digit epoch>
  const text = 'rate limit, reset_at: 1715190000';

  const match = detectRateLimit(text, patterns, 'result');
  assert.equal(match.matched, true, 'Should match reset_at_epoch');
  assert.equal(match.pattern.id, 'reset_at_epoch');

  const now = 1715180000;
  const ts  = extractResetTs(match, null, now);
  assert.equal(ts, 1715190000, 'Should extract 10-digit epoch correctly');
  console.log('PASS: extractResetTs epoch 10-digit');
}

// ─── extractResetTs — extract=epoch (13-digit ms) ────────────────────────────

{
  const patterns = loadPatterns(PATTERNS_PATH);
  const epochMs  = 1715190000000; // 13 digits
  const text     = `rate limit, resetsAt:${epochMs}`;

  const match = detectRateLimit(text, patterns, 'result');
  assert.equal(match.matched, true, 'Should match reset_at_epoch with 13-digit epoch');

  const now = 1715180000;
  const ts  = extractResetTs(match, null, now);
  // 1715190000000 ms → 1715190000 s
  assert.equal(ts, 1715190000, 'Should normalize 13-digit epoch ms to seconds');
  console.log('PASS: extractResetTs epoch 13-digit ms → seconds');
}

// ─── extractResetTs — extract=duration ───────────────────────────────────────

{
  const patterns = loadPatterns(PATTERNS_PATH);
  const text     = 'Please try again in 120 s';

  const match = detectRateLimit(text, patterns, 'result');
  assert.equal(match.matched, true, 'Should match try_again_in');
  assert.equal(match.extract, 'duration');

  const now = 1000000;
  const ts  = extractResetTs(match, null, now);
  assert.equal(ts, now + 120, 'Should compute now + 120s');
  console.log('PASS: extractResetTs duration seconds');
}

{
  const patterns = loadPatterns(PATTERNS_PATH);
  const text     = 'try again in 5 min';

  const match = detectRateLimit(text, patterns, 'result');
  assert.equal(match.matched, true);

  const now = 1000000;
  const ts  = extractResetTs(match, null, now);
  assert.equal(ts, now + 300, 'Should compute now + 5*60s');
  console.log('PASS: extractResetTs duration minutes');
}

{
  const patterns = loadPatterns(PATTERNS_PATH);
  const text     = 'try again in 2 h';

  const match = detectRateLimit(text, patterns, 'result');
  assert.equal(match.matched, true);

  const now = 1000000;
  const ts  = extractResetTs(match, null, now);
  assert.equal(ts, now + 7200, 'Should compute now + 2*3600s');
  console.log('PASS: extractResetTs duration hours');
}

// ─── extractResetTs — rateLimitEvent.resetsAt fallback ───────────────────────

{
  const patterns = loadPatterns(PATTERNS_PATH);
  // Match something without extract
  const match = detectRateLimit('too many requests', patterns, 'result');
  assert.equal(match.matched, true);

  const now  = 1000000;
  const rle  = { resetsAt: 1000600 };
  const ts   = extractResetTs(match, rle, now);
  assert.equal(ts, 1000600, 'Should use rateLimitEvent.resetsAt');
  console.log('PASS: extractResetTs uses rateLimitEvent.resetsAt');
}

// ─── extractResetTs — DEFAULT_BY_CATEGORY ────────────────────────────────────

{
  const now = 1000000;

  // plan_exhaustion default
  const matchPlan = { matched: true, category: 'plan_exhaustion', extract: undefined, rawExcerpt: 'Claude usage limit reached', pattern: undefined };
  const tsPlan = extractResetTs(matchPlan, null, now);
  assert.equal(tsPlan, now + DEFAULT_BY_CATEGORY.plan_exhaustion);
  console.log('PASS: extractResetTs default plan_exhaustion');

  // billing_block default
  const matchBill = { matched: true, category: 'billing_block', extract: undefined, rawExcerpt: 'credit low', pattern: undefined };
  const tsBill = extractResetTs(matchBill, null, now);
  assert.equal(tsBill, now + DEFAULT_BY_CATEGORY.billing_block);
  console.log('PASS: extractResetTs default billing_block');

  // transient default
  const matchTrans = { matched: true, category: 'transient', extract: undefined, rawExcerpt: 'overloaded', pattern: undefined };
  const tsTrans = extractResetTs(matchTrans, null, now);
  assert.equal(tsTrans, now + DEFAULT_BY_CATEGORY.transient);
  console.log('PASS: extractResetTs default transient');
}

// ─── calcBackoff ─────────────────────────────────────────────────────────────

{
  assert.equal(calcBackoff(0),  60,   'attempt 0 → 60s');
  assert.equal(calcBackoff(1),  120,  'attempt 1 → 120s');
  assert.equal(calcBackoff(2),  240,  'attempt 2 → 240s');
  assert.equal(calcBackoff(3),  480,  'attempt 3 → 480s');
  assert.equal(calcBackoff(4),  960,  'attempt 4 → 960s');
  assert.equal(calcBackoff(5),  1800, 'attempt 5 → capped at 1800s');
  assert.equal(calcBackoff(10), 1800, 'attempt 10 → capped at 1800s');
  console.log('PASS: calcBackoff exponential with 1800s cap');
}

console.log('\nAll rate-limit tests passed.');
