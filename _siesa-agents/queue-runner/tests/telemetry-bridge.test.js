'use strict';

/**
 * Unit tests for lib/telemetry-bridge.js
 * Story 1.5: Telemetry Bridge maps internal queue events to sa-emit.js invocations.
 */

const assert = require('node:assert/strict');
const path   = require('node:path');
const os     = require('node:os');
const fs     = require('node:fs');

const tmpDir = path.join(os.tmpdir(), `telemetry-bridge-test-${Date.now()}`);
fs.mkdirSync(tmpDir, { recursive: true });

function makeLogger() {
  const calls = { info: [], warn: [] };
  return {
    info: (msg, meta) => calls.info.push({ msg, meta }),
    warn: (msg, meta) => calls.warn.push({ msg, meta }),
    calls,
  };
}

function makeJob(type, storyId) {
  return { type, payload_json: JSON.stringify({ story_id: storyId }) };
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function freshBridge(logger) {
  delete require.cache[require.resolve('../lib/telemetry-bridge')];
  const { TelemetryBridge } = require('../lib/telemetry-bridge');
  return new TelemetryBridge({ logger });
}

// Write a fake sa-emit.js that records its argv to a file
function setupFakeEmit(argsFile) {
  const fakeEmitDir = path.join(tmpDir, '_siesa-agents', 'observability', 'scripts');
  fs.mkdirSync(fakeEmitDir, { recursive: true });
  fs.writeFileSync(
    path.join(fakeEmitDir, 'sa-emit.js'),
    `'use strict'; require('node:fs').writeFileSync(${JSON.stringify(argsFile)}, JSON.stringify(process.argv.slice(2)));\n`
  );
}

// ─── Run all tests sequentially ──────────────────────────────────────────────

(async () => {
  const origCwd = process.cwd;

  // ── Test 1: disabled mode when sa-emit.js does not exist ─────────────────
  {
    const emptyDir = path.join(tmpDir, 'empty');
    fs.mkdirSync(emptyDir, { recursive: true });
    process.cwd = () => emptyDir;

    const logger = makeLogger();
    const bridge = freshBridge(logger);

    assert.equal(bridge.disabled, true, 'Bridge should be disabled when sa-emit.js absent');
    assert.ok(logger.calls.warn.some(w => w.msg.includes('telemetry_bridge.disabled')),
      'Should warn when disabled');
    console.log('PASS: disabled mode when sa-emit.js not found');
  }

  // ── Test 2: emit() logs locally for any job type ─────────────────────────
  {
    const emptyDir = path.join(tmpDir, 'empty2');
    fs.mkdirSync(emptyDir, { recursive: true });
    process.cwd = () => emptyDir;

    const logger = makeLogger();
    const bridge = freshBridge(logger);

    bridge.emit('job.start', makeJob('custom', '1-2'), 'session-abc');

    assert.ok(logger.calls.info.some(l => l.msg === 'telemetry_bridge.job.start'),
      'Should produce local log for custom job');
    console.log('PASS: emit() logs locally for any job type including custom');
  }

  // ── Test 3: custom job does NOT trigger sa-emit even when enabled ─────────
  {
    const flagFile = path.join(tmpDir, 'custom-flag.txt');
    if (fs.existsSync(flagFile)) fs.unlinkSync(flagFile);

    const fakeEmitDir = path.join(tmpDir, '_siesa-agents', 'observability', 'scripts');
    fs.mkdirSync(fakeEmitDir, { recursive: true });
    fs.writeFileSync(
      path.join(fakeEmitDir, 'sa-emit.js'),
      `'use strict'; require('node:fs').writeFileSync(${JSON.stringify(flagFile)}, '1');\n`
    );

    process.cwd = () => tmpDir;
    const bridge = freshBridge(makeLogger());
    assert.equal(bridge.disabled, false, 'Bridge enabled when sa-emit.js exists');

    bridge.emit('job.start', makeJob('custom', '1-3'), 'session-xyz');
    await sleep(250);

    assert.ok(!fs.existsSync(flagFile), 'sa-emit must NOT be called for custom job');
    console.log('PASS: custom job type does not call sa-emit');
  }

  // ── Test 4: BMAD job invokes sa-emit with correct args ───────────────────
  {
    const argsFile = path.join(tmpDir, 'args-start.json');
    setupFakeEmit(argsFile);

    process.cwd = () => tmpDir;
    const bridge = freshBridge(makeLogger());

    bridge.emit('job.start', makeJob('dev-story', '1-5'), 'session-dev');
    await sleep(400);

    assert.ok(fs.existsSync(argsFile), 'sa-emit called for dev-story');
    const args = JSON.parse(fs.readFileSync(argsFile, 'utf8'));
    assert.ok(args.includes('--event'),           '--event present');
    assert.ok(args.includes('workflow.started'),  'job.start → workflow.started');
    assert.ok(args.includes('--phase'),           '--phase present');
    assert.ok(args.includes('dev-story'),         'phase = dev-story');
    assert.ok(args.includes('--story'),           '--story present');
    assert.ok(args.includes('1-5'),               'story = 1-5');
    assert.ok(args.includes('--session-id'),      '--session-id present');
    assert.ok(args.includes('session-dev'),       'session-id = session-dev');
    console.log('PASS: job.start emits workflow.started with correct args for BMAD job');
  }

  // ── Test 5: job.finish → workflow.finished; no --session-id when null ────
  {
    const argsFile = path.join(tmpDir, 'args-finish.json');
    setupFakeEmit(argsFile);

    process.cwd = () => tmpDir;
    const bridge = freshBridge(makeLogger());

    bridge.emit('job.finish', makeJob('code-review', '1-2'), null);
    await sleep(400);

    const args = JSON.parse(fs.readFileSync(argsFile, 'utf8'));
    assert.ok(args.includes('workflow.finished'), 'job.finish → workflow.finished');
    assert.ok(!args.includes('--session-id'),     'no --session-id when null');
    console.log('PASS: job.finish maps to workflow.finished; omits --session-id when null');
  }

  // ── Test 6: rate_limit.detected includes --from/--to ────────────────────
  {
    const argsFile = path.join(tmpDir, 'args-rl.json');
    setupFakeEmit(argsFile);

    process.cwd = () => tmpDir;
    const bridge = freshBridge(makeLogger());

    bridge.emit('rate_limit.detected', makeJob('create-story', '1-0'), 'session-rl');
    await sleep(400);

    const args = JSON.parse(fs.readFileSync(argsFile, 'utf8'));
    assert.ok(args.includes('status.changed'),     'rate_limit.detected → status.changed');
    assert.ok(args.includes('--from'),             '--from present');
    assert.ok(args.includes('running'),            'from = running');
    assert.ok(args.includes('--to'),               '--to present');
    assert.ok(args.includes('waiting_rate_limit'), 'to = waiting_rate_limit');
    console.log('PASS: rate_limit.detected → status.changed with --from/--to');
  }

  // ── Test 7: budget.exceeded does NOT call sa-emit (type = null) ──────────
  {
    const budgetFlag = path.join(tmpDir, 'budget-flag.txt');
    if (fs.existsSync(budgetFlag)) fs.unlinkSync(budgetFlag);

    const fakeEmitDir = path.join(tmpDir, '_siesa-agents', 'observability', 'scripts');
    fs.writeFileSync(
      path.join(fakeEmitDir, 'sa-emit.js'),
      `'use strict'; require('node:fs').writeFileSync(${JSON.stringify(budgetFlag)}, '1');\n`
    );

    process.cwd = () => tmpDir;
    const logger = makeLogger();
    const bridge = freshBridge(logger);

    bridge.emit('budget.exceeded', { type: null, payload_json: '{}' }, null);
    await sleep(250);

    assert.ok(!fs.existsSync(budgetFlag), 'sa-emit must NOT be called for budget.exceeded');
    assert.ok(logger.calls.info.some(l => l.msg === 'telemetry_bridge.budget.exceeded'),
      'budget.exceeded should produce a local log');
    console.log('PASS: budget.exceeded logs locally but does not invoke sa-emit');
  }

  process.cwd = origCwd;
  // Clean up require cache
  delete require.cache[require.resolve('../lib/telemetry-bridge')];

  console.log('\nAll telemetry-bridge tests passed.');
})().catch((err) => {
  console.error('TEST FAILED:', err.message);
  process.exit(1);
});
