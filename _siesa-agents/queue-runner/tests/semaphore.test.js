'use strict';

/**
 * Unit tests for lib/semaphore.js
 * AC #8: max-concurrency semaphore with abort support.
 */

const assert = require('node:assert/strict');
const { Semaphore } = require('../lib/semaphore');

// ─── Constructor validation ───────────────────────────────────────────────────

{
  assert.throws(() => new Semaphore(0),  /positive integer/, 'n=0 should throw');
  assert.throws(() => new Semaphore(-1), /positive integer/, 'n=-1 should throw');
  assert.throws(() => new Semaphore(1.5), /positive integer/, 'n=1.5 should throw');

  const s = new Semaphore(3);
  assert.equal(s.max, 3);
  assert.equal(s.count, 0);
  assert.equal(s.pending, 0);
  console.log('PASS: Semaphore constructor validates n');
}

// ─── Basic acquire/release ────────────────────────────────────────────────────

{
  const s = new Semaphore(2);

  // Acquire two permits synchronously
  const p1 = s.acquire();
  const p2 = s.acquire();

  Promise.all([p1, p2]).then(() => {
    assert.equal(s.count, 2, 'Two permits held');
    assert.equal(s.pending, 0);
    s.release();
    assert.equal(s.count, 1);
    s.release();
    assert.equal(s.count, 0);
    console.log('PASS: acquire/release basic flow');
  });
}

// ─── Blocking waiter resolves after release ───────────────────────────────────

{
  const s = new Semaphore(1);

  let resolved = false;

  s.acquire().then(() => {
    // Slot 1 held
    const waiter = s.acquire();
    waiter.then(() => {
      resolved = true;
    });

    assert.equal(s.pending, 1, 'One waiter queued');

    // Release slot 1 — waiter should resolve
    s.release();

    setImmediate(() => {
      assert.equal(resolved, true, 'Waiter resolved after release');
      assert.equal(s.pending, 0);
      s.release(); // release waiter's slot
      console.log('PASS: waiter resolves on release');
    });
  });
}

// ─── Abort rejects all waiters ─────────────────────────────────────────────────

{
  const s = new Semaphore(1);
  let rejectCount = 0;

  s.acquire().then(() => {
    // Two waiters
    s.acquire().catch(() => { rejectCount++; });
    s.acquire().catch(() => { rejectCount++; });

    assert.equal(s.pending, 2);

    s.abort();

    setImmediate(() => {
      assert.equal(rejectCount, 2, 'Both waiters rejected on abort');
      assert.equal(s.pending, 0);
      console.log('PASS: abort rejects all pending waiters');
    });
  });
}

// ─── acquire after abort rejects immediately ──────────────────────────────────

{
  const s = new Semaphore(1);
  s.abort();

  s.acquire().then(
    () => { assert.fail('should not resolve after abort'); },
    (err) => {
      assert.equal(err.message, 'semaphore_aborted');
      console.log('PASS: acquire after abort rejects immediately');
    }
  );
}

// ─── Spurious release is safe ─────────────────────────────────────────────────

{
  const s = new Semaphore(1);
  assert.doesNotThrow(() => s.release(), 'Spurious release should not throw');
  assert.equal(s.count, 0);
  console.log('PASS: spurious release is safe');
}

// ─── Waiter count matches pending ─────────────────────────────────────────────

{
  const s = new Semaphore(1);
  s.acquire(); // hold slot

  s.acquire().catch(() => {}); // waiter 1
  s.acquire().catch(() => {}); // waiter 2
  s.acquire().catch(() => {}); // waiter 3

  assert.equal(s.pending, 3, 'Three waiters pending');
  s.abort();
  assert.equal(s.pending, 0);
  console.log('PASS: pending count tracked correctly');
}

// ─── activeCount / waitingCount aliases (AC #3) ───────────────────────────────

{
  const s = new Semaphore(2);
  assert.equal(s.activeCount, 0, 'activeCount starts at 0');
  assert.equal(s.waitingCount, 0, 'waitingCount starts at 0');

  s.acquire(); // hold slot 1
  s.acquire(); // hold slot 2
  assert.equal(s.activeCount, 2, 'activeCount = 2 after two acquires');

  s.acquire().catch(() => {}); // waiter 1
  s.acquire().catch(() => {}); // waiter 2
  assert.equal(s.waitingCount, 2, 'waitingCount = 2 with two blocked waiters');

  s.abort();
  assert.equal(s.waitingCount, 0, 'waitingCount = 0 after abort');
  console.log('PASS: activeCount/waitingCount aliases work correctly');
}

console.log('\nAll semaphore tests passed.');
