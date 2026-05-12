'use strict';

const path = require('node:path');
const fs   = require('node:fs');

const { getEpicStatuses } = require('./sprint-status-parser');

/**
 * Resolve the sprint-status.yaml path.
 * Tries the short path first (current queue-runner default), then the
 * shared-artifacts variant used by newer BMAD installations.
 *
 * @param {string} [root] - Project root directory (defaults to SIESA_PROJECT_ROOT or cwd)
 * @returns {string|null} Resolved path, or null if not found
 */
function resolveSprintStatusPath(root) {
  const base = root || process.env.SIESA_PROJECT_ROOT || process.cwd();
  const candidates = [
    path.join(base, '_bmad-output', 'implementation-artifacts', 'sprint-status.yaml'),
    path.join(base, '_bmad-output', 'shared-artifacts', 'implementation-artifacts', 'sprint-status.yaml'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Check whether all epic dependencies declared in a job's payload are satisfied.
 * A dependency is satisfied when the epic's status is 'done' in sprint-status.yaml.
 *
 * Returns { ok: true, unmet: [] } when claimable:
 *   - the job has no depends_on_epics, OR
 *   - all declared epics are 'done'.
 *
 * Returns { ok: false, unmet: [...] } when:
 *   - any declared epic is not 'done', OR
 *   - sprint-status.yaml cannot be read (conservative: treat as unmet).
 *
 * @param {object} job - Job row with payload_json
 * @param {Object.<number,string>|null} [epicStatuses] - Pre-loaded epic statuses (optional, avoids re-reading the file)
 * @param {string} [projectRoot] - Override project root for resolving sprint-status.yaml
 * @returns {{ ok: boolean, unmet: number[] }}
 */
function checkDependencies(job, epicStatuses, projectRoot) {
  let payload;
  try {
    payload = JSON.parse(job.payload_json || '{}');
  } catch {
    return { ok: true, unmet: [] };
  }

  const deps = payload.depends_on_epics;
  if (!Array.isArray(deps) || deps.length === 0) return { ok: true, unmet: [] };

  let statuses = epicStatuses;
  if (!statuses) {
    const sprintPath = resolveSprintStatusPath(projectRoot);
    if (!sprintPath) return { ok: false, unmet: deps };
    try {
      statuses = getEpicStatuses(sprintPath);
    } catch {
      return { ok: false, unmet: deps };
    }
  }

  const unmet = deps.filter((n) => statuses[n] !== 'done');
  return { ok: unmet.length === 0, unmet };
}

module.exports = { resolveSprintStatusPath, checkDependencies };
