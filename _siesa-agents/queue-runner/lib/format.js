'use strict';

/**
 * Format an epoch-seconds timestamp as a human-readable local datetime string.
 * Uses the OS local timezone via Intl.DateTimeFormat.
 * @param {number|null|undefined} epochS - Epoch seconds
 * @returns {string}
 */
function formatTs(epochS) {
  if (!epochS) return '-';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'long',
  }).format(new Date(epochS * 1000));
}

/**
 * Format a duration in milliseconds as a human-readable string.
 * Large values: "Xh Ym Zs". Small values: "Xs" or "Xms".
 * @param {number|null|undefined} ms - Duration in milliseconds
 * @returns {string}
 */
function formatDuration(ms) {
  if (ms == null || ms < 0) return '-';
  if (ms < 1000) return `${ms}ms`;

  const totalSec = Math.floor(ms / 1000);
  const hours    = Math.floor(totalSec / 3600);
  const minutes  = Math.floor((totalSec % 3600) / 60);
  const seconds  = totalSec % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

module.exports = { formatTs, formatDuration };
