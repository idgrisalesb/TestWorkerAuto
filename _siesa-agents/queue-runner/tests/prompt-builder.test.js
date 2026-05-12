'use strict';

/**
 * Unit tests for lib/prompt-builder.js
 * AC #12: typed prompt construction for BMAD workflows.
 */

const assert = require('node:assert/strict');
const { buildPrompt, SAFE_TOOLS_WHITELIST } = require('../lib/prompt-builder');

function makeJob(payload) {
  return { payload_json: JSON.stringify(payload) };
}

// ─── create-story with story_id ───────────────────────────────────────────────

{
  const job = makeJob({ type: 'create-story', story_id: '1-2-my-story' });
  const { prompt, extraArgs } = buildPrompt(job);
  assert.ok(prompt.includes('/bmad:bmm:workflows:create-story'), 'create-story uses correct workflow path');
  assert.ok(prompt.includes('1-2-my-story'), 'story_id included in prompt');
  assert.ok(prompt.toLowerCase().includes('do not ask questions'), 'autonomous instruction included');
  assert.deepEqual(extraArgs, [], 'no extra args by default');
  console.log('PASS: create-story prompt built correctly');
}

// ─── dev-story with story_id ──────────────────────────────────────────────────

{
  const job = makeJob({ type: 'dev-story', story_id: '2-3-auth-module' });
  const { prompt } = buildPrompt(job);
  assert.ok(prompt.includes('/bmad:bmm:workflows:dev-story'), 'dev-story uses correct workflow path');
  assert.ok(prompt.includes('2-3-auth-module'), 'story_id included');
  console.log('PASS: dev-story prompt built correctly');
}

// ─── code-review with story_id ───────────────────────────────────────────────

{
  const job = makeJob({ type: 'code-review', story_id: '1-1-dispatcher' });
  const { prompt } = buildPrompt(job);
  assert.ok(prompt.includes('/bmad:bmm:workflows:code-review'), 'code-review uses correct workflow path');
  assert.ok(prompt.includes('1-1-dispatcher'), 'story_id included');
  assert.ok(prompt.toLowerCase().includes('fixes'), 'fix instruction included');
  console.log('PASS: code-review prompt built correctly');
}

// ─── Workflow types without story_id ─────────────────────────────────────────

{
  const noStory = makeJob({ type: 'dev-story' });
  const { prompt } = buildPrompt(noStory);
  assert.ok(prompt.startsWith('/bmad:bmm:workflows:dev-story'), 'works without story_id');
  console.log('PASS: workflow type without story_id works');
}

// ─── custom type with prompt ──────────────────────────────────────────────────

{
  const job = makeJob({ type: 'custom', prompt: 'do something specific', unsafe: true });
  const { prompt } = buildPrompt(job);
  assert.equal(prompt, 'do something specific', 'custom prompt returned verbatim');
  console.log('PASS: custom prompt returned verbatim');
}

// ─── custom type missing prompt throws ───────────────────────────────────────

{
  const job = makeJob({ type: 'custom' });
  assert.throws(() => buildPrompt(job), /requires payload\.prompt/, 'missing prompt throws');
  console.log('PASS: custom without prompt throws');
}

// ─── custom type with disallowed tools (no unsafe) ───────────────────────────

{
  const job = makeJob({
    type:         'custom',
    prompt:       'run my thing',
    allowedTools: ['Bash', 'SomeDangerousTool'],
  });
  assert.throws(() => buildPrompt(job), /disallowed tools/, 'disallowed tools throw without unsafe');
  console.log('PASS: custom with disallowed tools throws without unsafe=true');
}

// ─── custom type with disallowed tools + unsafe=true (allowed) ───────────────

{
  const job = makeJob({
    type:         'custom',
    prompt:       'run my thing',
    allowedTools: ['SomeDangerousTool'],
    unsafe:       true,
  });
  assert.doesNotThrow(() => buildPrompt(job), 'unsafe=true bypasses whitelist');
  console.log('PASS: unsafe=true bypasses tool whitelist');
}

// ─── allowedTools appended to extraArgs ──────────────────────────────────────

{
  const job = makeJob({
    type:         'dev-story',
    story_id:     '1-1',
    allowedTools: ['Bash', 'Read', 'Write'],
  });
  const { extraArgs } = buildPrompt(job);
  assert.equal(extraArgs[0], '--allowedTools', 'first extra arg is --allowedTools');
  assert.equal(extraArgs[1], 'Bash,Read,Write', 'tools joined by comma');
  console.log('PASS: allowedTools appended to extraArgs');
}

// ─── invalid payload_json gracefully defaults to custom ──────────────────────

{
  const job = { payload_json: 'not-json' };
  // Should throw because type defaults to 'custom' and no prompt
  assert.throws(() => buildPrompt(job), /requires payload\.prompt/, 'invalid JSON falls back to custom without prompt');
  console.log('PASS: invalid payload_json handled gracefully');
}

// ─── quick-dev with epic number ──────────────────────────────────────────────

{
  const job = makeJob({ type: 'quick-dev', epic: 3 });
  const { prompt, extraArgs } = buildPrompt(job);
  assert.ok(prompt.includes('/sa-quick-dev 3'), 'quick-dev prompt contains /sa-quick-dev with epic number');
  assert.ok(prompt.toLowerCase().includes('do not ask questions') ||
            prompt.toLowerCase().includes('unattended'), 'autonomous instruction included');
  assert.deepEqual(extraArgs, [], 'no extra args for quick-dev');
  console.log('PASS: quick-dev prompt built correctly');
}

// ─── quick-dev without epic throws ───────────────────────────────────────────

{
  const job = makeJob({ type: 'quick-dev' });
  assert.throws(() => buildPrompt(job), /requires payload\.epic/, 'quick-dev without epic throws');
  console.log('PASS: quick-dev without epic throws');
}

// ─── quick-dev with null epic throws ─────────────────────────────────────────

{
  const job = makeJob({ type: 'quick-dev', epic: null });
  assert.throws(() => buildPrompt(job), /requires payload\.epic/, 'quick-dev with null epic throws');
  console.log('PASS: quick-dev with null epic throws');
}

// ─── SAFE_TOOLS_WHITELIST is exported ────────────────────────────────────────

{
  assert.ok(Array.isArray(SAFE_TOOLS_WHITELIST), 'SAFE_TOOLS_WHITELIST is an array');
  assert.ok(SAFE_TOOLS_WHITELIST.includes('Bash'), 'Bash is in whitelist');
  console.log('PASS: SAFE_TOOLS_WHITELIST exported and contains Bash');
}

console.log('\nAll prompt-builder tests passed.');
