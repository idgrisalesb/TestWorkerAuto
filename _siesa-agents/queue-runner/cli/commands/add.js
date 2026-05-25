'use strict';

const crypto = require('node:crypto');
const os = require('node:os');
const path = require('node:path');

const { openDb } = require('../../lib/db');
const { parseSprintStatus, getEpicStatuses } = require('../../lib/sprint-status-parser');

const DEFAULT_SPRINT_STATUS_PATH = path.join(
  process.cwd(),
  '_bmad-output',
  'implementation-artifacts',
  'sprint-status.yaml',
);

const JOB_TYPES_FOR_STORY = ['create-story', 'dev-story', 'code-review'];

/**
 * Compute SHA-256 fingerprint of a normalized payload.
 * Keys are sorted to ensure determinism.
 * @param {object} payload
 * @returns {string} hex digest
 */
function fingerprint(payload) {
  const normalized = Object.fromEntries(
    Object.keys(payload).sort().map((k) => [k, payload[k]]),
  );
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

/**
 * @returns {number} current epoch seconds
 */
function nowSec() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Insert a single job. Returns true if inserted, false if duplicate.
 * @param {import('better-sqlite3').Database} db
 * @param {object} job
 * @param {boolean} force - use INSERT OR REPLACE instead of INSERT OR IGNORE
 * @returns {boolean}
 */
function insertJob(db, job, force) {
  const now = nowSec();
  const stmt = db.prepare(`
    ${force ? 'INSERT OR REPLACE' : 'INSERT OR IGNORE'} INTO jobs
      (type, state, priority, correlation_key, payload_json, input_fingerprint,
       model_override, max_retries, attempts, not_before_ts, created_at, updated_at)
    VALUES
      (@type, 'pending', @priority, @correlation_key, @payload_json, @input_fingerprint,
       @model_override, 8, 0, 0, @created_at, @updated_at)
  `);

  const result = stmt.run({
    type: job.type,
    priority: job.priority ?? 100,
    correlation_key: job.correlation_key ?? null,
    payload_json: JSON.stringify(job.payload),
    input_fingerprint: job.fingerprint,
    model_override: job.model ?? null,
    created_at: now,
    updated_at: now,
  });

  return result.changes > 0;
}

/**
 * Parse --depends-on-epics CSV string into an array of numbers.
 * @param {string|undefined} raw
 * @returns {number[]}
 */
function parseDependsOn(raw) {
  if (!raw) return [];
  return String(raw)
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

async function handler(argv) {
  const queueHome = process.env.SIESA_QUEUE_HOME || path.join(os.homedir(), '.siesa-queue');
  const dbPath = path.join(queueHome, 'queue.db');
  const db = openDb(dbPath);

  let inserted = 0;
  let skipped = 0;

  if (argv.fromEpics) {
    // --from-epics [--sprint-path <path>] [--depends-on-epics 1,2]
    const sprintPath = argv.sprintPath || DEFAULT_SPRINT_STATUS_PATH;
    const epicStatuses = getEpicStatuses(sprintPath);
    const dependsOn = parseDependsOn(argv.dependsOnEpics);

    const epicNumbers = Object.keys(epicStatuses)
      .map(Number)
      .sort((a, b) => a - b);

    for (const epicNum of epicNumbers) {
      if (epicStatuses[epicNum] === 'done') continue;

      const payload = {
        type: 'quick-dev',
        epic: epicNum,
        ...(dependsOn.length ? { depends_on_epics: dependsOn } : {}),
      };
      const fp = fingerprint(payload);
      const job = {
        type: 'quick-dev',
        priority: 100 + epicNum,
        correlation_key: 'bmad-cycle',
        payload,
        fingerprint: fp,
        model: argv.model ?? null,
      };
      const ok = insertJob(db, job, argv.force);
      ok ? inserted++ : skipped++;
    }
  } else if (argv.fromSprintStatus) {
    // --from-sprint-status [--sprint-path <path>]  (legacy: individual story jobs)
    const sprintPath = argv.sprintPath || DEFAULT_SPRINT_STATUS_PATH;

    const stories = parseSprintStatus(sprintPath);

    for (const { story_id, epic } of stories) {
      for (const type of JOB_TYPES_FOR_STORY) {
        const payload = {
          story_id,
          epic: String(epic),
          type,
        };
        const fp = fingerprint(payload);
        const job = {
          type,
          priority: 100,
          correlation_key: `story-${story_id}`,
          payload,
          fingerprint: fp,
          model: null,
        };
        const ok = insertJob(db, job, argv.force);
        ok ? inserted++ : skipped++;
      }
    }
  } else if (argv.custom) {
    // --custom --prompt "..."
    if (!argv.prompt) {
      console.error('Error: --custom requires --prompt');
      process.exit(1);
    }
    const tools = argv.tools ? String(argv.tools) : null;
    const payload = {
      type: 'custom',
      prompt: argv.prompt,
      ...(tools ? { allowedTools: tools } : {}),
      ...(argv.unsafe ? { unsafe: true } : {}),
    };
    const fp = fingerprint(payload);
    const job = {
      type: 'custom',
      priority: argv.priority ?? 100,
      correlation_key: argv.correlationKey ?? null,
      payload,
      fingerprint: fp,
      model: argv.model ?? null,
    };
    const ok = insertJob(db, job, argv.force);
    ok ? inserted++ : skipped++;
  } else if (argv.type === 'quick-dev') {
    // --type quick-dev --epic N [--depends-on-epics 1,2]
    if (argv.epic === undefined) {
      console.error('Error: --type quick-dev requires --epic');
      process.exit(1);
    }
    const epicNum = Number(argv.epic);
    const dependsOn = parseDependsOn(argv.dependsOnEpics);
    const payload = {
      type: 'quick-dev',
      epic: epicNum,
      ...(dependsOn.length ? { depends_on_epics: dependsOn } : {}),
    };
    const fp = fingerprint(payload);
    const job = {
      type: 'quick-dev',
      priority: argv.priority ?? (100 + epicNum),
      correlation_key: 'bmad-cycle',
      payload,
      fingerprint: fp,
      model: argv.model ?? null,
    };
    const ok = insertJob(db, job, argv.force);
    ok ? inserted++ : skipped++;
  } else {
    // --type <type> --story X-Y --epic N  (individual BMAD workflow jobs)
    if (!argv.type || !argv.story || argv.epic === undefined) {
      console.error('Error: --type, --story and --epic are required (or use --from-epics / --from-sprint-status / --custom)');
      process.exit(1);
    }
    const payload = {
      type: argv.type,
      story_id: argv.story,
      epic: String(argv.epic),
    };
    const fp = fingerprint(payload);
    const job = {
      type: argv.type,
      priority: argv.priority ?? 100,
      correlation_key: `story-${argv.story}`,
      payload,
      fingerprint: fp,
      model: argv.model ?? null,
    };
    const ok = insertJob(db, job, argv.force);
    ok ? inserted++ : skipped++;
  }

  db.close();

  if (inserted === 0 && skipped === 0) {
    console.log('0 jobs nuevos (ninguna historia ready-for-dev/in-progress encontrada).');
  } else if (skipped > 0 && inserted === 0) {
    console.log(`0 jobs nuevos (idempotencia): ${skipped} job(s) ya existían con el mismo fingerprint. Use --force para sobrescribir.`);
  } else {
    if (inserted > 0) console.log(`${inserted} job(s) añadidos en estado pending.`);
    if (skipped > 0) console.log(`${skipped} job(s) omitidos (ya existen).`);
  }
}

module.exports = {
  command: 'add',
  describe: 'Add job(s) to the queue',
  builder: (yargs) =>
    yargs
      .option('type',              { type: 'string',  description: 'Job type: quick-dev|create-story|dev-story|code-review|custom' })
      .option('story',             { type: 'string',  description: 'Story ID (e.g. 1-3) — used with individual BMAD workflow types' })
      .option('epic',              { type: 'number',  description: 'Epic number' })
      .option('model',             { type: 'string',  description: 'Model override: haiku|sonnet|opus' })
      .option('priority',          { type: 'number',  description: 'Priority (lower = first)' })
      .option('custom',            { type: 'boolean', description: 'Add a custom prompt job', default: false })
      .option('prompt',            { type: 'string',  description: 'Prompt text for --custom' })
      .option('tools',             { type: 'string',  description: 'Allowed tools for --custom (e.g. "Read,Edit")' })
      .option('from-epics',        { type: 'boolean', description: 'Import non-done epics from sprint-status.yaml as quick-dev jobs (recommended)', default: false })
      .option('from-sprint-status',{ type: 'boolean', description: 'Import ready-for-dev/in-progress stories as individual BMAD jobs (legacy)', default: false })
      .option('sprint-path',       { type: 'string',  description: 'Custom path to sprint-status.yaml' })
      .option('depends-on-epics',  { type: 'string',  description: 'Comma-separated epic numbers that must be done before this job runs (e.g. "1,2")' })
      .option('force',             { type: 'boolean', description: 'Replace existing jobs with same fingerprint', default: false })
      .option('correlation-key',   { type: 'string',  description: 'Explicit correlation key for custom jobs' })
      .option('unsafe',            { type: 'boolean', description: 'Grant full tool permissions for --custom jobs (skips allowedTools whitelist)', default: false }),
  handler,
};
