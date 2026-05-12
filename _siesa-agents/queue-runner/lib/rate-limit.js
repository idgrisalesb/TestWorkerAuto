'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Default wait times in seconds by rate-limit category.
 */
const DEFAULT_BY_CATEGORY = {
  transient:       300,    //  5 min
  plan_exhaustion: 18000,  //  5 h
  billing_block:   3600,   //  1 h + operator alert
  any:             1800,
};

/**
 * Load and compile patterns from rate-limit-patterns.json.
 * @param {string} patternsPath - Absolute path to rate-limit-patterns.json
 * @returns {Array<{id: string, compiledRe: RegExp, category: string, extract: string|undefined}>}
 */
function loadPatterns(patternsPath) {
  const raw = fs.readFileSync(patternsPath, 'utf8');
  const data = JSON.parse(raw);
  return data.patterns.map((p) => ({
    id:         p.id,
    compiledRe: new RegExp(p.re, 'i'),
    category:   p.category,
    extract:    p.extract,
  }));
}

/**
 * Detect rate-limit signal in text from a known source.
 * IMPORTANT: Only call this for source 'stderr' or 'result'.
 * Never call for text_delta to prevent false positives (strategy §14).
 *
 * @param {string} text - Text to scan
 * @param {Array<{id: string, compiledRe: RegExp, category: string, extract: string|undefined}>} patterns
 * @param {'stderr'|'result'} source - Origin of the text
 * @returns {{matched: boolean, pattern?: object, category?: string, extract?: string, rawExcerpt?: string}}
 */
function detectRateLimit(text, patterns, source) {
  if (source === 'text_delta') return { matched: false };
  if (!text || typeof text !== 'string') return { matched: false };

  for (const pattern of patterns) {
    if (pattern.compiledRe.test(text)) {
      return {
        matched:    true,
        pattern,
        category:   pattern.category,
        extract:    pattern.extract,
        rawExcerpt: text.slice(0, 500),
      };
    }
  }
  return { matched: false };
}

/**
 * Reload patterns from disk (hot-reload). Returns new compiled patterns array.
 * @param {string} patternsPath
 * @returns {Array<{id: string, compiledRe: RegExp, category: string, extract: string|undefined}>}
 */
function reloadPatterns(patternsPath) {
  const patterns = loadPatterns(patternsPath);
  return patterns;
}

/**
 * Extract reset timestamp (epoch UTC seconds) from a rate-limit match result.
 *
 * Order of precedence (strategy §6.3):
 *   1. extract=epoch  — epoch value from regex capture group (normalizes ms→s)
 *   2. extract=duration — now + parsed duration from regex capture group
 *   3. rateLimitEvent.resetsAt
 *   4. DEFAULT_BY_CATEGORY[category]
 *
 * @param {{matched: boolean, pattern?: object, category?: string, extract?: string, rawExcerpt?: string}} matchResult
 * @param {object|null} rateLimitEvent - Parsed rate_limit_event info (may have resetsAt)
 * @param {number} now - Current epoch seconds
 * @returns {number} reset_ts in epoch seconds
 */
function extractResetTs(matchResult, rateLimitEvent, now) {
  const category = matchResult.category || 'any';
  const extract  = matchResult.extract;
  const rawText  = matchResult.rawExcerpt || '';

  // 1. extract=epoch: parse epoch value from capture group
  if (extract === 'epoch' && matchResult.pattern) {
    const match = rawText.match(matchResult.pattern.compiledRe);
    if (match) {
      const captured = match[1];
      if (captured) {
        let epochVal = parseInt(captured, 10);
        // Normalize milliseconds to seconds (13-digit epoch)
        if (String(captured).length >= 13) {
          epochVal = Math.floor(epochVal / 1000);
        }
        if (epochVal > 0) return epochVal;
      }
    }
  }

  // 2. extract=duration: parse duration from capture group
  if (extract === 'duration' && matchResult.pattern) {
    const match = rawText.match(matchResult.pattern.compiledRe);
    if (match) {
      const amount = parseInt(match[1], 10);
      const unit   = (match[2] || 's').toLowerCase();
      let multiplier = 1;
      if (unit.startsWith('m')) multiplier = 60;
      else if (unit.startsWith('h')) multiplier = 3600;
      if (amount > 0) return now + amount * multiplier;
    }
  }

  // 3. rateLimitEvent.resetsAt
  if (rateLimitEvent && rateLimitEvent.resetsAt) {
    let resetsAt = Number(rateLimitEvent.resetsAt);
    // Normalize ms → s if needed
    if (String(rateLimitEvent.resetsAt).length >= 13) {
      resetsAt = Math.floor(resetsAt / 1000);
    }
    if (resetsAt > 0) return resetsAt;
  }

  // 4. Default by category
  const defaultWait = DEFAULT_BY_CATEGORY[category] ?? DEFAULT_BY_CATEGORY.any;
  return now + defaultWait;
}

/**
 * Calculate backoff seconds for a retry attempt.
 * Formula: min(60 * 2^attempts, 1800)
 * @param {number} attempts - Number of attempts already made
 * @returns {number} seconds to wait before next attempt
 */
function calcBackoff(attempts) {
  return Math.min(60 * Math.pow(2, attempts), 1800);
}

module.exports = {
  DEFAULT_BY_CATEGORY,
  loadPatterns,
  detectRateLimit,
  reloadPatterns,
  extractResetTs,
  calcBackoff,
};
