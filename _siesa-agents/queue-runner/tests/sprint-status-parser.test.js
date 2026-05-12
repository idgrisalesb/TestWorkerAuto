'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { parseSprintStatus, getEpicStatuses } = require('../lib/sprint-status-parser');

/**
 * Write a temp sprint-status.yaml and return its path.
 * @param {string} content
 * @returns {string}
 */
function writeTempYaml(content) {
  const tmpPath = path.join(os.tmpdir(), `sprint-status-${Date.now()}-${Math.random()}.yaml`);
  fs.writeFileSync(tmpPath, content, 'utf8');
  return tmpPath;
}

// ─── parseSprintStatus: only ready-for-dev and in-progress ───────────────────
{
  const yaml = `
sprint: 1
development_status:
  epic-1: in-progress
    1-1: ready-for-dev
    1-2: in-progress
    1-3: done
  epic-2: backlog
    2-1: backlog
    2-2: review
`;
  const tmpPath = writeTempYaml(yaml);
  const result = parseSprintStatus(tmpPath);
  fs.unlinkSync(tmpPath);

  assert.equal(result.length, 2, `Should return only ready-for-dev and in-progress stories (got ${result.length})`);
  assert.ok(result.find((s) => s.story_id === '1-1' && s.status === 'ready-for-dev'), 'story 1-1 ready-for-dev included');
  assert.ok(result.find((s) => s.story_id === '1-2' && s.status === 'in-progress'), 'story 1-2 in-progress included');
  assert.ok(!result.find((s) => s.story_id === '1-3'), 'done story excluded');
  assert.ok(!result.find((s) => s.story_id === '2-1'), 'backlog story excluded');
  assert.ok(!result.find((s) => s.story_id === '2-2'), 'review story excluded');
  console.log('PASS: parseSprintStatus only includes ready-for-dev and in-progress');
}

// ─── parseSprintStatus: retrospective lines are skipped ──────────────────────
{
  const yaml = `
development_status:
  epic-1: in-progress
    1-1: ready-for-dev
    1-retrospective: done
`;
  const tmpPath = writeTempYaml(yaml);
  const result = parseSprintStatus(tmpPath);
  fs.unlinkSync(tmpPath);

  assert.equal(result.length, 1, 'Only one story, retrospective should be skipped');
  assert.equal(result[0].story_id, '1-1');
  console.log('PASS: retrospective lines skipped');
}

// ─── parseSprintStatus: only content after development_status: is parsed ─────
{
  const yaml = `
1-1: ready-for-dev
development_status:
  epic-1: in-progress
    1-2: in-progress
`;
  const tmpPath = writeTempYaml(yaml);
  const result = parseSprintStatus(tmpPath);
  fs.unlinkSync(tmpPath);

  assert.equal(result.length, 1, 'Only entries after development_status: should be parsed');
  assert.equal(result[0].story_id, '1-2');
  console.log('PASS: only development_status block parsed');
}

// ─── parseSprintStatus: comments and blank lines ignored ─────────────────────
{
  const yaml = `
development_status:
  # This is a comment
  epic-1: in-progress

    1-1: ready-for-dev
`;
  const tmpPath = writeTempYaml(yaml);
  const result = parseSprintStatus(tmpPath);
  fs.unlinkSync(tmpPath);

  assert.equal(result.length, 1);
  console.log('PASS: comments and blank lines ignored');
}

// ─── getEpicStatuses: returns map of epic number → status ────────────────────
{
  const yaml = `
development_status:
  epic-1: in-progress
    1-1: ready-for-dev
  epic-2: backlog
    2-1: backlog
  epic-3: done
    3-1: done
`;
  const tmpPath = writeTempYaml(yaml);
  const result = getEpicStatuses(tmpPath);
  fs.unlinkSync(tmpPath);

  assert.deepEqual(result, { 1: 'in-progress', 2: 'backlog', 3: 'done' },
    'getEpicStatuses returns correct status map');
  console.log('PASS: getEpicStatuses returns correct epic status map');
}

// ─── getEpicStatuses: skips epic-N-last-update, epic-N-source, retrospective ─
{
  const yaml = `
development_status:
  epic-1: in-progress
  epic-1-last-update: 2025-05-01
  epic-1-source: some/path.md
  epic-1-retrospective: optional
    1-1: ready-for-dev
  epic-2: done
`;
  const tmpPath = writeTempYaml(yaml);
  const result = getEpicStatuses(tmpPath);
  fs.unlinkSync(tmpPath);

  assert.deepEqual(result, { 1: 'in-progress', 2: 'done' },
    'Only pure epic-N keys included; metadata keys excluded');
  console.log('PASS: getEpicStatuses excludes metadata keys (last-update, source, retrospective)');
}

// ─── getEpicStatuses: empty file returns empty object ────────────────────────
{
  const yaml = `project: test\n`;
  const tmpPath = writeTempYaml(yaml);
  const result = getEpicStatuses(tmpPath);
  fs.unlinkSync(tmpPath);

  assert.deepEqual(result, {}, 'No development_status block returns empty object');
  console.log('PASS: getEpicStatuses on file without development_status returns empty object');
}

console.log('\nAll sprint-status-parser tests passed.');
