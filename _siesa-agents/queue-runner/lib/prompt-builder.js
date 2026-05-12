'use strict';

/**
 * Typed prompt builder for BMAD workflows.
 *
 * AC #12: builds the prompt string from payload.type and payload.story_id,
 * following the template pattern from bmad_orchestrator.py:64-73.
 *
 * Supported types:
 *   - create-story : /bmad:bmm:workflows:create-story
 *   - dev-story    : /bmad:bmm:workflows:dev-story
 *   - code-review  : /bmad:bmm:workflows:code-review
 *   - custom       : payload.prompt verbatim (validated against whitelist)
 *
 * allowedTools argv appended when payload.allowedTools is set.
 */

/**
 * Whitelist of allowed tool patterns for custom jobs without payload.unsafe=true.
 * (strategy §14)
 */
const SAFE_TOOLS_WHITELIST = [
  'Bash',
  'Read',
  'Write',
  'Edit',
  'Glob',
  'Grep',
];

/**
 * Build the prompt string for a job.
 *
 * @param {object} job           - Job row from DB (with payload_json string)
 * @returns {{ prompt: string, extraArgs: string[] }}
 *   prompt    - Full prompt string to pass to claude
 *   extraArgs - Additional argv entries (e.g. ['--allowedTools', '...'])
 */
function buildPrompt(job) {
  let payload;
  try {
    payload = JSON.parse(job.payload_json || '{}');
  } catch {
    payload = {};
  }

  const type    = payload.type    || 'custom';
  const storyId = payload.story_id;
  const extraArgs = [];

  // Append --allowedTools if defined in payload
  if (Array.isArray(payload.allowedTools) && payload.allowedTools.length > 0) {
    extraArgs.push('--allowedTools', payload.allowedTools.join(','));
  }

  let prompt;

  switch (type) {
    case 'create-story':
      prompt = storyId
        ? `/bmad:bmm:workflows:create-story create story ${storyId}. Do not ask questions. Proceed autonomously. Generate the story file directly.`
        : '/bmad:bmm:workflows:create-story. Do not ask questions. Proceed autonomously.';
      break;

    case 'dev-story':
      prompt = storyId
        ? `/bmad:bmm:workflows:dev-story implement story ${storyId}. Do not ask questions. Proceed autonomously. Implement all tasks.`
        : '/bmad:bmm:workflows:dev-story. Do not ask questions. Proceed autonomously.';
      break;

    case 'code-review':
      prompt = storyId
        ? `/bmad:bmm:workflows:code-review review the code for story ${storyId}. Apply ALL fixes automatically. Do not ask questions.`
        : '/bmad:bmm:workflows:code-review. Apply ALL fixes automatically. Do not ask questions.';
      break;

    case 'quick-dev': {
      const epic = payload.epic;
      if (epic === undefined || epic === null) {
        throw new Error('quick-dev job requires payload.epic');
      }
      prompt = `/sa-quick-dev ${epic}. Unattended mode: do not ask questions, proceed autonomously on epic ${epic}. Process all pending stories in order.`;
      break;
    }

    case 'custom':
    default:
      if (!payload.prompt) {
        throw new Error(`custom job requires payload.prompt`);
      }

      // Validate allowedTools against whitelist for non-unsafe custom jobs
      if (!payload.unsafe && Array.isArray(payload.allowedTools)) {
        const invalid = payload.allowedTools.filter(
          (t) => !SAFE_TOOLS_WHITELIST.includes(t)
        );
        if (invalid.length > 0) {
          throw new Error(
            `custom job: disallowed tools [${invalid.join(', ')}]. ` +
            `Set payload.unsafe=true to bypass whitelist (WARNING: grants full permissions).`
          );
        }
      }

      prompt = payload.prompt;
      break;
  }

  return { prompt, extraArgs };
}

module.exports = { buildPrompt, SAFE_TOOLS_WHITELIST };
