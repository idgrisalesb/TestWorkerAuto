'use strict';

/**
 * Cost Manager — resolves the effective model and calculates/records USD cost.
 *
 * AC #4: resolveModel — precedence: job.model_override > policy.by_type > policy.default > env
 * AC #5: calcCost     — formula from strategy §8.3
 * AC #5: recordCost   — INSERT into cost_ledger
 * AC #10: model_used  — stored in runs before spawn and cost_ledger on close
 */

/**
 * Resolve the effective Claude model name for a job.
 * Precedence (highest to lowest):
 *   1. job.model_override
 *   2. policy.by_type[job.type]
 *   3. policy.default
 *   4. process.env.SIESA_QUEUE_DEFAULT_MODEL
 *
 * @param {object} job    - Row from jobs table (.type, .model_override)
 * @param {object} policy - Loaded model-policy.json object
 * @returns {string} Effective model name (e.g. "sonnet", "haiku", "opus")
 */
function resolveModel(job, policy) {
  if (job.model_override) return job.model_override;

  if (policy && policy.by_type && policy.by_type[job.type]) {
    return policy.by_type[job.type];
  }

  if (policy && policy.default) return policy.default;

  return process.env.SIESA_QUEUE_DEFAULT_MODEL || 'sonnet';
}

/**
 * Calculate the USD cost for a completed run.
 * Uses rates from policy.rates_usd_per_mtok keyed by the first matching model
 * prefix (e.g. "claude-3-5-haiku-..." → looks up "haiku").
 *
 * @param {object} usage       - result.usage from Claude CLI stream event
 * @param {string} modelName   - Effective model name (output of resolveModel)
 * @param {object} policy      - Loaded model-policy.json object
 * @returns {{ cost_usd: number, breakdown: object }}
 */
function calcCost(usage, modelName, policy) {
  const rates = resolveRates(modelName, policy);

  const inputTokens       = (usage && usage.input_tokens)                   || 0;
  const outputTokens      = (usage && usage.output_tokens)                  || 0;
  const cacheReadTokens   = (usage && usage.cache_read_input_tokens)        || 0;
  const cacheWriteTokens  = (usage && usage.cache_creation_input_tokens)    || 0;

  const cost_usd =
    (inputTokens      / 1e6) * rates.input       +
    (outputTokens     / 1e6) * rates.output      +
    (cacheReadTokens  / 1e6) * rates.cache_read  +
    (cacheWriteTokens / 1e6) * rates.cache_write;

  return {
    cost_usd,
    breakdown: {
      input_tokens:       inputTokens,
      output_tokens:      outputTokens,
      cache_read_tokens:  cacheReadTokens,
      cache_write_tokens: cacheWriteTokens,
      rates,
    },
  };
}

/**
 * Persist a cost record for a completed run.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {object} opts
 * @param {number}  opts.jobId
 * @param {number}  opts.runId
 * @param {number}  opts.ts        - epoch seconds
 * @param {string}  opts.model     - effective model name
 * @param {object}  opts.usage     - result.usage
 * @param {number}  opts.cost_usd  - computed cost
 */
function recordCost(db, { jobId, runId, ts, model, usage, cost_usd }) {
  const inputTokens      = (usage && usage.input_tokens)                || 0;
  const outputTokens     = (usage && usage.output_tokens)               || 0;
  const cacheReadTokens  = (usage && usage.cache_read_input_tokens)     || 0;
  const cacheWriteTokens = (usage && usage.cache_creation_input_tokens) || 0;

  db.prepare(`
    INSERT INTO cost_ledger
      (job_id, run_id, ts, model, input_tokens, output_tokens, cache_read, cache_create, cost_usd)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    jobId,
    runId,
    ts,
    model,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    cost_usd,
  );
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Look up rates for a model name.
 * Tries exact match first, then prefix match (e.g. "claude-3-haiku-20240307" → "haiku").
 * Falls back to sonnet rates if no match found.
 *
 * @param {string} modelName
 * @param {object} policy
 * @returns {{ input: number, output: number, cache_read: number, cache_write: number }}
 */
function resolveRates(modelName, policy) {
  const defaultRates = { input: 3.00, output: 15.00, cache_read: 0.30, cache_write: 3.75 };

  if (!policy || !policy.rates_usd_per_mtok) return defaultRates;

  const ratesMap = policy.rates_usd_per_mtok;

  // Exact match
  if (ratesMap[modelName]) return ratesMap[modelName];

  // Prefix/substring match (e.g. full Claude model API name contains "haiku", "sonnet", "opus")
  const lowerName = modelName.toLowerCase();
  for (const key of Object.keys(ratesMap)) {
    if (lowerName.includes(key.toLowerCase())) {
      return ratesMap[key];
    }
  }

  return defaultRates;
}

module.exports = { resolveModel, calcCost, recordCost };
