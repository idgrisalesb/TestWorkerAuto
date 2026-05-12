#!/usr/bin/env node
// sa-emit.js — Emit BMAD workflow lifecycle events via OTLP to the OTel collector.
//
// Resolves session_id automatically by walking up the process tree to find claude.exe
// (its PID was recorded by the SessionStart hook in ~/.claude/observability/session-<pid>.json).
// On *.finished events it reads the session's transcript JSONL and sums token usage
// since the matching *.started event.
//
// Usage:
//   node sa-emit.js --event workflow.started  --story "1-1-user-auth" --phase "create-story"
//   node sa-emit.js --event status.changed    --story "1-1-user-auth" --phase "create-story" --from "backlog" --to "ready-for-dev"
//   node sa-emit.js --event workflow.finished --story "1-1-user-auth" --phase "create-story"
//   node sa-emit.js --event fix.started       --story "1-1-user-auth" --phase "code-review" --fix-option "auto_fix"
//   node sa-emit.js --event fix.finished      --story "1-1-user-auth" --phase "code-review" --fix-option "auto_fix"
//
// Optional overrides (useful for simulations / multi-engineer scenarios):
//   --engineer "<name>"          Override git config user.name for this emit
//   --project-id "<name>"        Override the git-remote-derived project id
//   --timestamp-offset-ms <ms>   Subtract ms from the event timestamp (backdate the log record)
//
// Endpoint resolution (in priority order):
//   1. SA_OTLP_ENDPOINT                      — sa-emit-specific base URL ('/v1/logs' is appended)
//   2. OTEL_EXPORTER_OTLP_LOGS_ENDPOINT      — CC native logs endpoint (full URL, used as-is)
//   3. OTEL_EXPORTER_OTLP_ENDPOINT           — CC native generic endpoint ('/v1/logs' is appended)
//   None ⇒ event is buffered to disk and a clear ERROR is logged. No localhost fallback.
//
// Headers resolution: SA_OTLP_HEADERS  ||  OTEL_EXPORTER_OTLP_HEADERS  ||  (empty)

'use strict'

const fs = require('fs')
const path = require('path')
const os = require('os')
const { execSync } = require('child_process')
const { findClaudePid } = require('./sa-pid')

function loadDotEnv() {
  // Single source of truth: project-local .env in the current working directory.
  const envPath = path.join(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) return
  try {
    const content = fs.readFileSync(envPath, 'utf8')
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const idx = line.indexOf('=')
      if (idx === -1) continue
      const key = line.slice(0, idx).trim()
      let val = line.slice(idx + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (key && process.env[key] === undefined) {
        process.env[key] = val
      }
    }
  } catch (_) {}
}
loadDotEnv()

const VALID_EVENTS      = ['workflow.started', 'workflow.finished', 'status.changed', 'fix.started', 'fix.finished']
const VALID_PHASES      = ['create-story', 'dev-story', 'code-review']
const VALID_FIX_OPTIONS = ['auto_fix', 'action_items', 'show_details']

function parseArgs(argv) {
  const result = {}
  let i = 0
  while (i < argv.length) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const key  = arg.slice(2)
      const next = argv[i + 1]
      if (next !== undefined && !next.startsWith('--')) {
        result[key] = next
        i += 2
      } else {
        result[key] = true
        i += 1
      }
    } else {
      i += 1
    }
  }
  return result
}

const args      = parseArgs(process.argv.slice(2))
const event     = args['event']
const story     = args['story']
const phase     = args['phase']
const from      = args['from']
const to        = args['to']
let   fixOption = args['fix-option']
const engineerOverride   = args['engineer']
const projectIdOverride  = args['project-id']
const timestampOffsetMs  = args['timestamp-offset-ms'] ? parseInt(args['timestamp-offset-ms'], 10) : 0

if (!event || !story || !phase) {
  console.error('Error: --event, --story, and --phase are required')
  console.error('Usage: node sa-emit.js --event <event> --story <story> --phase <phase> [--from <from>] [--to <to>] [--fix-option <opt>]')
  process.exit(1)
}
if (!VALID_EVENTS.includes(event)) {
  console.error(`Error: --event must be one of: ${VALID_EVENTS.join(', ')}`)
  process.exit(1)
}
if (!VALID_PHASES.includes(phase)) {
  console.error(`Error: --phase must be one of: ${VALID_PHASES.join(', ')}`)
  process.exit(1)
}
if (fixOption && !VALID_FIX_OPTIONS.includes(fixOption)) {
  console.error(`Error: --fix-option must be one of: ${VALID_FIX_OPTIONS.join(', ')}`)
  process.exit(1)
}

function resolveOtlpLogsUrl() {
  if (process.env.SA_OTLP_ENDPOINT) {
    return process.env.SA_OTLP_ENDPOINT.replace(/\/+$/, '') + '/v1/logs'
  }
  if (process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT) {
    return process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT
  }
  if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    return process.env.OTEL_EXPORTER_OTLP_ENDPOINT.replace(/\/+$/, '') + '/v1/logs'
  }
  return null
}
function resolveOtlpHeaders() {
  return process.env.SA_OTLP_HEADERS || process.env.OTEL_EXPORTER_OTLP_HEADERS || ''
}
const otlpUrl  = resolveOtlpLogsUrl()
const stateDir = path.join(os.homedir(), '.claude', 'observability')

const epicIdMatch = story.match(/^(\d+)-/)
const epicId      = epicIdMatch ? epicIdMatch[1] : 'unknown'

let projectId = 'unknown'
if (projectIdOverride) {
  projectId = projectIdOverride
} else {
  try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim()
    const m = remoteUrl.match(/[:/]([^/:]+\/[^/]+?)(?:\.git)?$/)
    if (m) projectId = m[1]
  } catch (_) {}
}

let engineer = 'unknown'
if (engineerOverride) {
  engineer = engineerOverride
} else {
  try {
    const gitUser = execSync('git config user.name', { encoding: 'utf8' }).trim()
    if (gitUser) engineer = gitUser
  } catch (_) {}
}

// ---------- Session resolution via PID walk (helper in ./sa-pid) ----------

function loadSessionByClaudePid(claudePid) {
  if (claudePid == null) return null
  const f = path.join(stateDir, `session-${claudePid}.json`)
  if (!fs.existsSync(f)) return null
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'))
  } catch (_) { return null }
}

// queue-runner: accept explicit --session-id flag
const claudePid   = args['session-id'] ? null : findClaudePid()
const sessionInfo = loadSessionByClaudePid(claudePid)
const sessionId   = args['session-id'] || (sessionInfo && sessionInfo.session_id ? sessionInfo.session_id : null)

// ---------- State files (per workflow / fix) — now also include claude_pid for cleanup ----------

const nowMs       = Date.now()
const eventTimeMs = nowMs - (Number.isFinite(timestampOffsetMs) ? timestampOffsetMs : 0)
const tsNano      = `${eventTimeMs}000000`

const safeKey   = story.replace(/[^a-zA-Z0-9-]/g, '')
const stateFile = path.join(stateDir, `wf-${phase}-${safeKey}.json`)
let   durationMs = null
let   wfStartMs  = null

if (event === 'workflow.started') {
  fs.mkdirSync(stateDir, { recursive: true })
  fs.writeFileSync(stateFile, JSON.stringify({ start_ms: nowMs, claude_pid: claudePid, session_id: sessionId }))
}

if (event === 'workflow.finished') {
  if (fs.existsSync(stateFile)) {
    try {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'))
      wfStartMs   = state.start_ms
      durationMs  = nowMs - state.start_ms
      fs.unlinkSync(stateFile)
    } catch (_) {}
  }
}

const fixStateFile = path.join(stateDir, `fix-${phase}-${safeKey}.json`)
let   fixStartMs   = null

if (event === 'fix.started') {
  fs.mkdirSync(stateDir, { recursive: true })
  fs.writeFileSync(fixStateFile, JSON.stringify({
    start_ms: nowMs, fix_option: fixOption, claude_pid: claudePid, session_id: sessionId,
  }))
}

if (event === 'fix.finished') {
  if (fs.existsSync(fixStateFile)) {
    try {
      const fixState = JSON.parse(fs.readFileSync(fixStateFile, 'utf8'))
      fixStartMs     = fixState.start_ms
      durationMs     = nowMs - fixState.start_ms
      if (!fixOption) fixOption = fixState.fix_option
      fs.unlinkSync(fixStateFile)
    } catch (_) {}
  }
}

// ---------- Token aggregation from the session JSONL (only on *.finished) ----------

function parseIsoToMs(s) {
  if (!s) return null
  const t = Date.parse(s)
  return Number.isNaN(t) ? null : t
}

function sumTokensFromTranscript(transcriptPath, sinceMs) {
  const totals = { input: 0, output: 0, cache_read: 0, cache_creation: 0 }
  const models = new Set()
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return { totals, models }
  try {
    const content = fs.readFileSync(transcriptPath, 'utf8')
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed) continue
      let rec
      try { rec = JSON.parse(trimmed) } catch (_) { continue }
      const tsMs = parseIsoToMs(rec.timestamp || rec.createdAt)
      if (sinceMs != null && tsMs != null && tsMs < sinceMs) continue
      const msg   = rec.message || {}
      const usage = msg.usage || rec.usage
      if (!usage) continue
      totals.input          += parseInt(usage.input_tokens                || 0, 10) || 0
      totals.output         += parseInt(usage.output_tokens               || 0, 10) || 0
      totals.cache_read     += parseInt(usage.cache_read_input_tokens     || 0, 10) || 0
      totals.cache_creation += parseInt(usage.cache_creation_input_tokens || 0, 10) || 0
      const model = msg.model || rec.model
      if (model) models.add(String(model))
    }
  } catch (_) {}
  return { totals, models }
}

let tokenAttrs = []
if ((event === 'workflow.finished' || event === 'fix.finished') && sessionInfo && sessionInfo.transcript_path) {
  const sinceMs = (event === 'fix.finished') ? fixStartMs : wfStartMs
  if (sinceMs != null) {
    const { totals, models } = sumTokensFromTranscript(sessionInfo.transcript_path, sinceMs)
    tokenAttrs = [
      { key: 'tokens_input',          value: { intValue: totals.input } },
      { key: 'tokens_output',         value: { intValue: totals.output } },
      { key: 'tokens_cache_read',     value: { intValue: totals.cache_read } },
      { key: 'tokens_cache_creation', value: { intValue: totals.cache_creation } },
      { key: 'tokens_total',          value: { intValue: totals.input + totals.output + totals.cache_read + totals.cache_creation } },
    ]
    if (models.size) tokenAttrs.push({ key: 'models_used', value: { stringValue: [...models].sort().join(',') } })
  }
}

// ---------- Build OTLP log ----------

const attributes = [
  { key: 'event',    value: { stringValue: event } },
  { key: 'story_id', value: { stringValue: story } },
  { key: 'epic_id',  value: { stringValue: epicId } },
  { key: 'phase',    value: { stringValue: phase } },
]

if (sessionId)            attributes.push({ key: 'session_id',  value: { stringValue: sessionId } })
if (from)                 attributes.push({ key: 'from',        value: { stringValue: from } })
if (to)                   attributes.push({ key: 'to',          value: { stringValue: to } })
if (fixOption)            attributes.push({ key: 'fix_option',  value: { stringValue: fixOption } })
if (durationMs !== null)  attributes.push({ key: 'duration_ms', value: { intValue: durationMs } })
for (const a of tokenAttrs) attributes.push(a)

const otlpBody = {
  resourceLogs: [
    {
      resource: {
        attributes: [
          { key: 'service.name', value: { stringValue: 'bmad' } },
          { key: 'project_id',   value: { stringValue: projectId } },
          { key: 'engineer',     value: { stringValue: engineer } },
        ],
      },
      scopeLogs: [
        {
          scope: { name: 'bmad.observability' },
          logRecords: [
            {
              timeUnixNano:         tsNano,
              observedTimeUnixNano: tsNano,
              severityNumber:       9,
              severityText:         'INFO',
              body:                 { stringValue: `${event} | story=${story} phase=${phase} project=${projectId} engineer=${engineer}${sessionId ? ` session=${sessionId}` : ''}` },
              attributes,
            },
          ],
        },
      ],
    },
  ],
}

function parseHeaders(raw) {
  const out = {}
  if (!raw) return out
  for (const pair of raw.split(',')) {
    const idx = pair.indexOf('=')
    if (idx === -1) continue
    const key = pair.slice(0, idx).trim()
    const val = pair.slice(idx + 1).trim()
    if (key) out[key] = val
  }
  return out
}

function bufferEvent(reason) {
  const bufferDir = path.join(stateDir, 'buffer')
  fs.mkdirSync(bufferDir, { recursive: true })
  fs.appendFileSync(path.join(bufferDir, 'events.jsonl'), JSON.stringify({ reason, otlpBody }) + '\n')
}

;(async () => {
  if (!otlpUrl) {
    bufferEvent('no-endpoint-configured')
    console.error(`[sa-emit] ERROR no OTLP endpoint configured (set SA_OTLP_ENDPOINT or OTEL_EXPORTER_OTLP_LOGS_ENDPOINT). Event buffered.`)
    process.exit(0)
  }
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...parseHeaders(resolveOtlpHeaders()),
    }
    const response = await fetch(otlpUrl, {
      method:  'POST',
      headers,
      body:    JSON.stringify(otlpBody),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    let msg = `[sa-emit] ${event} | story=${story} phase=${phase} project=${projectId} engineer=${engineer}`
    if (sessionId)              msg += ` session=${sessionId}`
    if (durationMs !== null)    msg += ` duration=${durationMs}ms`
    if (tokenAttrs.length) {
      const totalAttr = tokenAttrs.find(a => a.key === 'tokens_total')
      if (totalAttr) msg += ` tokens=${totalAttr.value.intValue}`
    }
    console.log(msg)
  } catch (err) {
    const errMsg = (err && err.message) ? err.message : String(err)
    bufferEvent(`transport-error: ${errMsg}`)
    console.log(`[sa-emit] BUFFERED (gateway unreachable: ${errMsg}) | ${event} story=${story}`)
  }
})()
