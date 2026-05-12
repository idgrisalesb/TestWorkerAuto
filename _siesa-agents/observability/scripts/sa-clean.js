#!/usr/bin/env node
// sa-clean.js — Manual cleanup of ~/.claude/observability/ state files.
//
// Safe for parallel CC sessions: deletes only files that don't belong to a
// currently-alive claude.exe process. Files of live sessions are never touched.
//
// Usage:
//   node sa-clean.js --dry-run               # list what would be deleted
//   node sa-clean.js --apply                 # actually delete
//   node sa-clean.js --apply --rotate-buffer # also rotate buffer/events.jsonl if > 5 MB
//
// Rules:
//   - session-<pid>.json     → delete unless <pid> is alive
//   - session-id-<uuid>.json → delete unless its recorded claude_pid is alive
//   - wf-*.json / fix-*.json → delete unless its recorded claude_pid is alive
//   - any other file (logs, etc.) → never touched

'use strict'

const fs = require('fs')
const path = require('path')
const os = require('os')
const { getAliveClaudePids } = require('./sa-pid')

const STATE_DIR        = path.join(os.homedir(), '.claude', 'observability')
const BUFFER_FILE      = path.join(STATE_DIR, 'buffer', 'events.jsonl')
const BUFFER_MAX_BYTES = 5 * 1024 * 1024
const BUFFER_KEEP_ROTATIONS = 3

function parseArgs(argv) {
  const flags = new Set()
  for (const a of argv) if (a.startsWith('--')) flags.add(a.slice(2))
  return flags
}

function readPidFromFile(p) {
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'))
    const v = data.claude_pid
    return v == null ? null : parseInt(v, 10)
  } catch (_) { return null }
}

function classify(alivePids) {
  const toDelete = []
  const toKeep   = []
  if (!fs.existsSync(STATE_DIR)) return { toDelete, toKeep }

  for (const name of fs.readdirSync(STATE_DIR)) {
    const full = path.join(STATE_DIR, name)
    let stat
    try { stat = fs.statSync(full) } catch (_) { continue }
    if (!stat.isFile()) continue
    if (name === 'hook-errors.log') continue

    if (name.startsWith('session-') && name.endsWith('.json')) {
      if (name.startsWith('session-id-')) {
        const pid = readPidFromFile(full)
        if (pid != null && alivePids.has(pid)) toKeep.push(full)
        else toDelete.push(full)
      } else {
        const m = name.match(/^session-(\d+)\.json$/)
        if (!m) { toDelete.push(full); continue }
        const pid = parseInt(m[1], 10)
        if (alivePids.has(pid)) toKeep.push(full)
        else toDelete.push(full)
      }
    } else if ((name.startsWith('wf-') || name.startsWith('fix-')) && name.endsWith('.json')) {
      const pid = readPidFromFile(full)
      if (pid != null && alivePids.has(pid)) toKeep.push(full)
      else toDelete.push(full)
    } else {
      toKeep.push(full)
    }
  }
  return { toDelete, toKeep }
}

function rotateBufferIfNeeded() {
  if (!fs.existsSync(BUFFER_FILE)) return null
  let size
  try { size = fs.statSync(BUFFER_FILE).size } catch (_) { return null }
  if (size < BUFFER_MAX_BYTES) return null
  try {
    for (let i = BUFFER_KEEP_ROTATIONS; i >= 1; i--) {
      const src = `${BUFFER_FILE}.${i}`
      const dst = `${BUFFER_FILE}.${i + 1}`
      if (!fs.existsSync(src)) continue
      if (i === BUFFER_KEEP_ROTATIONS) fs.unlinkSync(src)
      else fs.renameSync(src, dst)
    }
    fs.renameSync(BUFFER_FILE, `${BUFFER_FILE}.1`)
    return `rotated ${path.basename(BUFFER_FILE)} (${size.toLocaleString()} bytes)`
  } catch (e) {
    return `rotation failed: ${e && e.message}`
  }
}

;(function main() {
  const flags = parseArgs(process.argv.slice(2))
  const dryRun = flags.has('dry-run')
  const apply  = flags.has('apply')
  const rotate = flags.has('rotate-buffer')

  if (dryRun === apply) {
    console.error('Usage: node sa-clean.js (--dry-run | --apply) [--rotate-buffer]')
    process.exit(1)
  }

  const alivePids = getAliveClaudePids()
  const { toDelete, toKeep } = classify(alivePids)

  console.log(`Live claude.exe PIDs: ${alivePids.size ? '[' + [...alivePids].sort((a,b) => a-b).join(', ') + ']' : '(none detected)'}`)
  console.log(`Files to keep:        ${toKeep.length}`)
  console.log(`Files to delete:      ${toDelete.length}`)
  for (const f of toDelete) console.log(`  - ${path.basename(f)}`)

  if (apply) {
    let deleted = 0
    for (const f of toDelete) {
      try { fs.unlinkSync(f); deleted++ }
      catch (e) { console.log(`  ! failed to delete ${path.basename(f)}: ${e && e.message}`) }
    }
    console.log(`Deleted: ${deleted}`)
    if (rotate) {
      const r = rotateBufferIfNeeded()
      console.log(r || `Buffer below ${BUFFER_MAX_BYTES / (1024 * 1024)} MB — no rotation needed.`)
    }
  } else if (rotate) {
    const r = rotateBufferIfNeeded()
    if (r) console.log(`(dry-run, but --rotate-buffer was applied) ${r}`)
  }
})()
