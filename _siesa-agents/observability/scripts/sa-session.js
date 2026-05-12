#!/usr/bin/env node
// sa-session.js — SessionStart hook handler.
//
// Persists session info keyed by the claude.exe PID, so any sa-emit.js
// subprocess (running from inside a workflow's Bash) can later resolve its
// own session_id by walking up the process tree.

'use strict'

const fs = require('fs')
const path = require('path')
const os = require('os')
const { findClaudePid } = require('./sa-pid')

const STATE_DIR = path.join(os.homedir(), '.claude', 'observability')

function logError(msg) {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true })
    fs.appendFileSync(path.join(STATE_DIR, 'hook-errors.log'), `sa-session: ${msg}\n`)
  } catch (_) {}
}

;(async () => {
  let raw = ''
  try {
    for await (const chunk of process.stdin) raw += chunk
  } catch (e) {
    logError(`stdin read failed: ${e && e.message}`)
    process.exit(0)
  }

  let data = {}
  if (raw.trim()) {
    try { data = JSON.parse(raw) }
    catch (e) {
      logError(`stdin parse failed: ${e && e.message}`)
      process.exit(0)
    }
  }

  const sessionId = data.session_id
  if (!sessionId) process.exit(0)

  const claudePid = findClaudePid()

  const state = {
    session_id:      sessionId,
    transcript_path: data.transcript_path || null,
    cwd:             data.cwd || process.cwd(),
    source:          data.source || null,
    model:           data.model || null,
    claude_pid:      claudePid,
  }

  try {
    fs.mkdirSync(STATE_DIR, { recursive: true })
    if (claudePid != null) {
      fs.writeFileSync(path.join(STATE_DIR, `session-${claudePid}.json`), JSON.stringify(state))
    }
    fs.writeFileSync(path.join(STATE_DIR, `session-id-${sessionId}.json`), JSON.stringify(state))
  } catch (e) {
    logError(`persist failed: ${e && e.message}`)
  }
  process.exit(0)
})()
