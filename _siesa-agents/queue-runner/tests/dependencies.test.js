'use strict';

/**
 * Tests for lib/dependencies.js — epic dependency checking.
 *
 * Verifies that checkDependencies correctly gates quick-dev jobs based on
 * the depends_on_epics payload field and the state of sprint-status.yaml.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { checkDependencies, resolveSprintStatusPath } = require('../lib/dependencies');

function writeTempYaml(dir, content) {
  const p = path.join(dir, 'sprint-status.yaml');
  fs.writeFileSync(p, content, 'utf8');
  return p;
}

function makeJob(payload) {
  return { payload_json: JSON.stringify(payload) };
}

// ─── No depends_on_epics: always ok ──────────────────────────────────────────
{
  const job = makeJob({ type: 'quick-dev', epic: 2 });
  const { ok, unmet } = checkDependencies(job, null);
  assert.ok(ok, 'Job with no depends_on_epics is claimable');
  assert.deepEqual(unmet, [], 'No unmet deps');
  console.log('PASS: job with no depends_on_epics is always claimable');
}

// ─── Empty depends_on_epics array: always ok ─────────────────────────────────
{
  const job = makeJob({ type: 'quick-dev', epic: 2, depends_on_epics: [] });
  const { ok } = checkDependencies(job, null);
  assert.ok(ok, 'Empty depends_on_epics is claimable');
  console.log('PASS: empty depends_on_epics is always claimable');
}

// ─── Dependency met: epic is done ─────────────────────────────────────────────
{
  const job = makeJob({ type: 'quick-dev', epic: 2, depends_on_epics: [1] });
  const epicStatuses = { 1: 'done', 2: 'backlog' };
  const { ok, unmet } = checkDependencies(job, epicStatuses);
  assert.ok(ok, 'Job is claimable when dependency epic is done');
  assert.deepEqual(unmet, [], 'No unmet deps');
  console.log('PASS: dependency met when epic is done');
}

// ─── Dependency unmet: epic is in-progress ───────────────────────────────────
{
  const job = makeJob({ type: 'quick-dev', epic: 2, depends_on_epics: [1] });
  const epicStatuses = { 1: 'in-progress', 2: 'backlog' };
  const { ok, unmet } = checkDependencies(job, epicStatuses);
  assert.ok(!ok, 'Job is not claimable when dependency epic is in-progress');
  assert.deepEqual(unmet, [1], 'Epic 1 listed as unmet');
  console.log('PASS: dependency unmet when epic is in-progress');
}

// ─── Multiple deps: all must be done ─────────────────────────────────────────
{
  const job = makeJob({ type: 'quick-dev', epic: 3, depends_on_epics: [1, 2] });
  const epicStatuses = { 1: 'done', 2: 'in-progress', 3: 'backlog' };
  const { ok, unmet } = checkDependencies(job, epicStatuses);
  assert.ok(!ok, 'All deps must be done');
  assert.deepEqual(unmet, [2], 'Only epic 2 unmet');
  console.log('PASS: all deps must be done; partial done not enough');
}

// ─── All multiple deps done ───────────────────────────────────────────────────
{
  const job = makeJob({ type: 'quick-dev', epic: 3, depends_on_epics: [1, 2] });
  const epicStatuses = { 1: 'done', 2: 'done', 3: 'backlog' };
  const { ok, unmet } = checkDependencies(job, epicStatuses);
  assert.ok(ok, 'Claimable when all deps done');
  assert.deepEqual(unmet, [], 'No unmet deps');
  console.log('PASS: claimable when all multiple deps are done');
}

// ─── Sprint-status.yaml missing: deps unmet (conservative) ───────────────────
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dep-test-'));
  try {
    const job = makeJob({ type: 'quick-dev', epic: 2, depends_on_epics: [1] });
    // Pass null epicStatuses so checkDependencies tries to read the file.
    // Override projectRoot to a dir without sprint-status.yaml.
    const { ok } = checkDependencies(job, null, tmpDir);
    assert.ok(!ok, 'Missing sprint-status.yaml → deps treated as unmet');
    console.log('PASS: missing sprint-status.yaml treated as unmet (conservative)');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ─── Sprint-status.yaml present: reads correctly ─────────────────────────────
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dep-test-'));
  try {
    const implDir = path.join(tmpDir, '_bmad-output', 'implementation-artifacts');
    fs.mkdirSync(implDir, { recursive: true });
    fs.writeFileSync(path.join(implDir, 'sprint-status.yaml'), `
development_status:
  epic-1: done
    1-1: done
  epic-2: in-progress
    2-1: ready-for-dev
`);
    const job = makeJob({ type: 'quick-dev', epic: 2, depends_on_epics: [1] });
    const { ok } = checkDependencies(job, null, tmpDir);
    assert.ok(ok, 'Reads sprint-status.yaml and resolves done dependency');
    console.log('PASS: checkDependencies reads sprint-status.yaml from disk correctly');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ─── resolveSprintStatusPath: finds short path first ─────────────────────────
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dep-path-test-'));
  try {
    const shortPath = path.join(tmpDir, '_bmad-output', 'implementation-artifacts');
    fs.mkdirSync(shortPath, { recursive: true });
    fs.writeFileSync(path.join(shortPath, 'sprint-status.yaml'), 'development_status:\n');

    const resolved = resolveSprintStatusPath(tmpDir);
    assert.ok(resolved && resolved.includes('implementation-artifacts'), 'Resolves short path');
    assert.ok(!resolved.includes('shared-artifacts'), 'Prefers short path over shared-artifacts');
    console.log('PASS: resolveSprintStatusPath finds short path first');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ─── resolveSprintStatusPath: falls back to shared-artifacts ─────────────────
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dep-path-test-'));
  try {
    const longPath = path.join(tmpDir, '_bmad-output', 'shared-artifacts', 'implementation-artifacts');
    fs.mkdirSync(longPath, { recursive: true });
    fs.writeFileSync(path.join(longPath, 'sprint-status.yaml'), 'development_status:\n');

    const resolved = resolveSprintStatusPath(tmpDir);
    assert.ok(resolved && resolved.includes('shared-artifacts'), 'Falls back to shared-artifacts');
    console.log('PASS: resolveSprintStatusPath falls back to shared-artifacts variant');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ─── resolveSprintStatusPath: returns null if not found ──────────────────────
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dep-path-test-'));
  try {
    const resolved = resolveSprintStatusPath(tmpDir);
    assert.equal(resolved, null, 'Returns null when no sprint-status.yaml found');
    console.log('PASS: resolveSprintStatusPath returns null when file not found');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ─── Non-quick-dev job with depends_on_epics: ignored (safety) ───────────────
{
  const job = makeJob({ type: 'dev-story', story_id: '1-1', depends_on_epics: [1] });
  const epicStatuses = { 1: 'in-progress' };
  // checkDependencies respects the field regardless of type; the field itself gates it
  const { ok } = checkDependencies(job, epicStatuses);
  assert.ok(!ok, 'depends_on_epics respected on any job type');
  console.log('PASS: depends_on_epics respected regardless of job type');
}

console.log('\nAll dependencies tests passed.');
