'use strict';

/**
 * Unit tests for lib/cost.js
 * Covers AC #4 (resolveModel precedence), AC #5 (calcCost formula, recordCost)
 */

const assert = require('node:assert/strict');
const fs     = require('node:fs');
const os     = require('node:os');
const path   = require('node:path');

const { openDb }                       = require('../lib/db');
const { resolveModel, calcCost, recordCost } = require('../lib/cost');

// Reference model-policy.json from config
const POLICY_PATH = path.join(__dirname, '../config/model-policy.json');
const policy      = JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));

function tmpDbPath() {
  return path.join(os.tmpdir(), `cost-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function insertJob(db, overrides = {}) {
  const now = nowSec();
  const fp  = `fp-${Math.random().toString(36).slice(2)}`;
  const r   = db.prepare(`
    INSERT INTO jobs (type, state, priority, payload_json, input_fingerprint,
                      max_retries, attempts, not_before_ts, model_override, created_at, updated_at)
    VALUES (@type, 'pending', 100, '{}', @fp, 8, 0, 0, @model_override, @now, @now)
  `).run({
    type:           overrides.type          ?? 'dev-story',
    fp,
    model_override: overrides.model_override ?? null,
    now,
  });
  return {
    id:             r.lastInsertRowid,
    type:           overrides.type          ?? 'dev-story',
    model_override: overrides.model_override ?? null,
  };
}

function insertRun(db, jobId) {
  const r = db.prepare(`
    INSERT INTO runs (job_id, attempt_number, session_id, started_at, is_error, rate_limited)
    VALUES (?, 1, 'test-uuid', ?, 0, 0)
  `).run(jobId, nowSec());
  return r.lastInsertRowid;
}

// ─── AC #4: resolveModel precedence ──────────────────────────────────────────

// Priority 1: job.model_override
{
  const job = { type: 'dev-story', model_override: 'opus' };
  assert.equal(resolveModel(job, policy), 'opus', 'model_override wins over all');
  console.log('PASS: resolveModel — model_override has highest priority');
}

// Priority 2: policy.by_type
{
  const job = { type: 'code-review', model_override: null };
  assert.equal(resolveModel(job, policy), 'haiku', 'code-review maps to haiku via by_type');
  console.log('PASS: resolveModel — policy.by_type["code-review"] = haiku');
}

{
  const job = { type: 'dev-story', model_override: null };
  assert.equal(resolveModel(job, policy), 'sonnet', 'dev-story maps to sonnet via by_type');
  console.log('PASS: resolveModel — policy.by_type["dev-story"] = sonnet');
}

// Priority 3: policy.default
{
  const job = { type: 'unknown-type', model_override: null };
  assert.equal(resolveModel(job, policy), policy.default, 'Unknown type falls back to policy.default');
  console.log('PASS: resolveModel — unknown type falls back to policy.default');
}

// Priority 4: env var SIESA_QUEUE_DEFAULT_MODEL
{
  const oldEnv = process.env.SIESA_QUEUE_DEFAULT_MODEL;
  process.env.SIESA_QUEUE_DEFAULT_MODEL = 'opus';

  const job = { type: 'unknown-type', model_override: null };
  assert.equal(resolveModel(job, null), 'opus', 'No policy → env var fallback');

  process.env.SIESA_QUEUE_DEFAULT_MODEL = oldEnv;
  console.log('PASS: resolveModel — no policy → env var SIESA_QUEUE_DEFAULT_MODEL');
}

// ─── AC #5: calcCost formula (strategy §8.3) ──────────────────────────────────

{
  // Haiku rates: input=1, output=5, cache_read=0.10, cache_write=1.25 (per Mtok)
  const usage = {
    input_tokens:                  1_000_000, // 1 Mtok
    output_tokens:                   500_000, // 0.5 Mtok
    cache_read_input_tokens:         200_000, // 0.2 Mtok
    cache_creation_input_tokens:     100_000, // 0.1 Mtok
  };

  const { cost_usd, breakdown } = calcCost(usage, 'haiku', policy);

  // Expected:
  //   1e6/1e6 * 1.00 = 1.00
  //   0.5e6/1e6 * 5.00 = 2.50
  //   0.2e6/1e6 * 0.10 = 0.02
  //   0.1e6/1e6 * 1.25 = 0.125
  //   total = 3.645
  const expected = 3.645;
  assert.ok(
    Math.abs(cost_usd - expected) < 1e-9,
    `calcCost haiku expected ${expected}, got ${cost_usd}`,
  );
  assert.equal(breakdown.input_tokens,      1_000_000);
  assert.equal(breakdown.output_tokens,       500_000);
  assert.equal(breakdown.cache_read_tokens,   200_000);
  assert.equal(breakdown.cache_write_tokens,  100_000);
  console.log(`PASS: calcCost haiku = $${cost_usd.toFixed(9)} (expected ${expected})`);
}

{
  // Sonnet rates: input=3, output=15, cache_read=0.30, cache_write=3.75 (per Mtok)
  const usage = {
    input_tokens:                  2_000_000,
    output_tokens:                   800_000,
    cache_read_input_tokens:               0,
    cache_creation_input_tokens:           0,
  };

  const { cost_usd } = calcCost(usage, 'sonnet', policy);

  // 2.0 * 3 + 0.8 * 15 = 6 + 12 = 18
  const expected = 18.0;
  assert.ok(Math.abs(cost_usd - expected) < 1e-9, `calcCost sonnet expected ${expected}, got ${cost_usd}`);
  console.log(`PASS: calcCost sonnet = $${cost_usd.toFixed(6)} (expected ${expected})`);
}

// Missing fields default to 0
{
  const usage = { input_tokens: 1_000_000 }; // no output/cache fields
  const { cost_usd } = calcCost(usage, 'haiku', policy);
  const expected = 1.00; // 1e6/1e6 * 1.00 input only
  assert.ok(Math.abs(cost_usd - expected) < 1e-9, `calcCost handles missing usage fields`);
  console.log('PASS: calcCost handles missing usage fields (defaults to 0)');
}

// Null usage → 0 cost
{
  const { cost_usd } = calcCost(null, 'haiku', policy);
  assert.equal(cost_usd, 0, 'Null usage → $0 cost');
  console.log('PASS: calcCost null usage → $0');
}

// ─── AC #5: recordCost inserts row in cost_ledger ────────────────────────────

{
  const dbPath = tmpDbPath();
  const db     = openDb(dbPath);

  const job    = insertJob(db, { type: 'code-review' });
  const runId  = insertRun(db, job.id);
  const nowS   = nowSec();

  const usage = {
    input_tokens:               500_000,
    output_tokens:              200_000,
    cache_read_input_tokens:      50_000,
    cache_creation_input_tokens:  10_000,
  };

  const { cost_usd } = calcCost(usage, 'haiku', policy);

  recordCost(db, {
    jobId:    job.id,
    runId,
    ts:       nowS,
    model:    'haiku',
    usage,
    cost_usd,
  });

  const row = db.prepare('SELECT * FROM cost_ledger WHERE job_id=?').get(job.id);
  assert.ok(row,                                  'cost_ledger row inserted');
  assert.equal(row.model,        'haiku',         'model stored correctly');
  assert.equal(row.input_tokens,  500_000,        'input_tokens stored');
  assert.equal(row.output_tokens, 200_000,        'output_tokens stored');
  assert.equal(row.cache_read,     50_000,        'cache_read stored');
  assert.equal(row.cache_create,   10_000,        'cache_create stored');
  assert.ok(Math.abs(row.cost_usd - cost_usd) < 1e-9, 'cost_usd stored correctly');

  db.close();
  fs.unlinkSync(dbPath);
  console.log('PASS: recordCost inserts correct row in cost_ledger');
}

// ─── AC #5: cost_ledger aggregation by model ─────────────────────────────────

{
  const dbPath = tmpDbPath();
  const db     = openDb(dbPath);
  const nowS   = nowSec();

  const haiku1  = insertJob(db, { type: 'code-review' });
  const haiku2  = insertJob(db, { type: 'code-review' });
  const sonnet1 = insertJob(db, { type: 'dev-story' });

  const runH1  = insertRun(db, haiku1.id);
  const runH2  = insertRun(db, haiku2.id);
  const runS1  = insertRun(db, sonnet1.id);

  const usageSmall = { input_tokens: 100_000, output_tokens: 50_000, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };

  // Insert two haiku records and one sonnet record
  const haikuCost1 = calcCost(usageSmall, 'haiku', policy).cost_usd;
  const haikuCost2 = calcCost(usageSmall, 'haiku', policy).cost_usd;
  const sonnetCost = calcCost(usageSmall, 'sonnet', policy).cost_usd;

  recordCost(db, { jobId: haiku1.id,  runId: runH1, ts: nowS, model: 'haiku',  usage: usageSmall, cost_usd: haikuCost1 });
  recordCost(db, { jobId: haiku2.id,  runId: runH2, ts: nowS, model: 'haiku',  usage: usageSmall, cost_usd: haikuCost2 });
  recordCost(db, { jobId: sonnet1.id, runId: runS1, ts: nowS, model: 'sonnet', usage: usageSmall, cost_usd: sonnetCost });

  const rows = db.prepare(`
    SELECT model, SUM(cost_usd) AS total FROM cost_ledger GROUP BY model ORDER BY model
  `).all();

  assert.equal(rows.length, 2, 'Two distinct models');
  const haikuRow  = rows.find((r) => r.model === 'haiku');
  const sonnetRow = rows.find((r) => r.model === 'sonnet');

  assert.ok(Math.abs(haikuRow.total  - (haikuCost1 + haikuCost2)) < 1e-9, 'Haiku total matches sum');
  assert.ok(Math.abs(sonnetRow.total - sonnetCost)                 < 1e-9, 'Sonnet total is correct');
  assert.ok(haikuRow.total !== sonnetRow.total, 'Haiku and sonnet totals are different');

  db.close();
  fs.unlinkSync(dbPath);
  console.log('PASS: cost_ledger aggregation by model returns differentiated sums');
}

console.log('\nAll cost tests passed.');
