'use strict';

/**
 * In-memory semaphore for limiting concurrent Workers.
 *
 * AC #8: guarantees maximum N concurrent Workers.
 * Supports SIGTERM interruption — callers awaiting acquire() will reject
 * if the daemon signals shutdown before a slot becomes available.
 */

class Semaphore {
  /**
   * @param {number} n - Maximum concurrent permits.
   */
  constructor(n) {
    if (!Number.isInteger(n) || n < 1) {
      throw new RangeError(`Semaphore: n must be a positive integer, got ${n}`);
    }
    this._max     = n;
    this._count   = 0;        // number of held permits
    this._queue   = [];       // waiters: Array<{resolve, reject}>
    this._aborted = false;    // set to true on daemon SIGTERM
  }

  /**
   * Acquire a permit. Resolves when a slot is available.
   * Rejects with Error('semaphore_aborted') if the daemon signals shutdown
   * before the permit can be granted.
   * @returns {Promise<void>}
   */
  acquire() {
    return new Promise((resolve, reject) => {
      if (this._aborted) {
        reject(new Error('semaphore_aborted'));
        return;
      }

      if (this._count < this._max) {
        this._count++;
        resolve();
      } else {
        this._queue.push({ resolve, reject });
      }
    });
  }

  /**
   * Release a permit. Unblocks the next waiter if any.
   */
  release() {
    if (this._count <= 0) return; // defensive: ignore spurious releases

    if (this._queue.length > 0) {
      // Pass the permit directly to the next waiter — count stays the same
      const waiter = this._queue.shift();
      waiter.resolve();
    } else {
      this._count--;
    }
  }

  /**
   * Abort all pending waiters (called on daemon SIGTERM/SIGINT).
   * Subsequent acquire() calls reject immediately.
   */
  abort() {
    this._aborted = true;
    const err = new Error('semaphore_aborted');
    for (const waiter of this._queue) {
      waiter.reject(err);
    }
    this._queue = [];
  }

  /** @returns {number} Number of currently held permits. */
  get count() {
    return this._count;
  }

  /** @returns {number} Number of currently held permits (alias for count). */
  get activeCount() {
    return this._count;
  }

  /** @returns {number} Maximum permits. */
  get max() {
    return this._max;
  }

  /** @returns {number} Pending waiters in queue. */
  get pending() {
    return this._queue.length;
  }

  /** @returns {number} Number of callers waiting for a permit (alias for pending). */
  get waitingCount() {
    return this._queue.length;
  }
}

/**
 * Singleton semaphore configured from SIESA_QUEUE_MAX_CONCURRENCY (default 1).
 */
const MAX_CONCURRENCY = parseInt(process.env.SIESA_QUEUE_MAX_CONCURRENCY || '1', 10);
const semaphore = new Semaphore(Number.isFinite(MAX_CONCURRENCY) && MAX_CONCURRENCY >= 1 ? MAX_CONCURRENCY : 1);

module.exports = { Semaphore, semaphore };
