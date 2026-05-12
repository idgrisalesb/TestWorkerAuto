'use strict';

const fs = require('node:fs');

/**
 * Parse a sprint-status.yaml file (stdlib-only, no yaml library).
 * Replicates logic from siesa-agents/scripts/bmad_orchestrator.py:93-139.
 *
 * @param {string} filePath - Path to sprint-status.yaml
 * @returns {Array<{epic: number, story_id: string, status: string}>}
 *   Stories with status 'ready-for-dev' or 'in-progress' only.
 */
function parseSprintStatus(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');

  const stories = [];
  let inDevStatus = false;
  let currentEpic = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === 'development_status:') { inDevStatus = true; continue; }
    if (!inDevStatus) continue;
    if (!line || line.startsWith('#')) continue;

    const m = line.match(/^(\S+):\s*(\S+)/);
    if (!m) continue;

    const key = m[1];
    const value = m[2];

    const epicMatch = key.match(/^epic-(\d+)$/);
    if (epicMatch) {
      currentEpic = parseInt(epicMatch[1], 10);
      continue;
    }

    if (key.includes('retrospective')) continue;

    const storyMatch = key.match(/^(\d+)-(\d+)/);
    if (storyMatch && currentEpic !== null) {
      if (value === 'ready-for-dev' || value === 'in-progress') {
        stories.push({ epic: currentEpic, story_id: key, status: value });
      }
    }
  }

  return stories;
}

/**
 * Extract epic-level statuses from a sprint-status.yaml file.
 *
 * @param {string} filePath - Path to sprint-status.yaml
 * @returns {Object.<number, string>} Map of epic number → status (e.g. { 1: 'in-progress', 2: 'backlog' })
 */
function getEpicStatuses(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');

  const epics = {};
  let inDevStatus = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === 'development_status:') { inDevStatus = true; continue; }
    if (!inDevStatus) continue;
    if (!line || line.startsWith('#')) continue;

    const m = line.match(/^(\S+):\s*(\S+)/);
    if (!m) continue;

    const epicMatch = m[1].match(/^epic-(\d+)$/);
    if (epicMatch) {
      epics[parseInt(epicMatch[1], 10)] = m[2];
    }
  }

  return epics;
}

module.exports = { parseSprintStatus, getEpicStatuses };
