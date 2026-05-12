// sa-pid.js — Shared helpers for finding the owning claude.exe PID and listing
// currently-alive claude.exe PIDs on the host. Cross-platform (Windows + POSIX).

'use strict'

const fs = require('fs')
const { execSync } = require('child_process')

function snapshotProcessesWindows() {
  // Returns Map<pid, { ppid, name }>. Empty Map on failure.
  const map = new Map()
  try {
    const out = execSync(
      'powershell -NoProfile -Command "Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name | ConvertTo-Csv -NoTypeInformation"',
      { encoding: 'utf8', timeout: 10000, windowsHide: true },
    )
    for (const raw of out.split(/\r?\n/).slice(1)) {
      const line = raw.trim()
      if (!line) continue
      const m = line.match(/^"(\d+)","(\d+)","([^"]+)"/)
      if (!m) continue
      map.set(parseInt(m[1], 10), { ppid: parseInt(m[2], 10), name: m[3] })
    }
  } catch (_) {}
  return map
}

function findClaudePidWindows(startPid) {
  const map = snapshotProcessesWindows()
  let cur = startPid
  for (let i = 0; i < 30; i++) {
    const info = map.get(cur)
    if (!info) return null
    if (info.name && /^claude/i.test(info.name) && /\.exe$/i.test(info.name)) return cur
    if (info.ppid === 0 || info.ppid === cur) return null
    cur = info.ppid
  }
  return null
}

function findClaudePidPosix(startPid) {
  try {
    let cur = startPid
    for (let i = 0; i < 30; i++) {
      const status = `/proc/${cur}/status`
      const comm   = `/proc/${cur}/comm`
      if (!fs.existsSync(status)) return null
      const lines = fs.readFileSync(status, 'utf8').split('\n')
      let ppid = null
      for (const ln of lines) {
        if (ln.startsWith('PPid:')) { ppid = parseInt(ln.split(/\s+/)[1], 10); break }
      }
      const name = fs.existsSync(comm) ? fs.readFileSync(comm, 'utf8').trim() : ''
      if (/^claude/i.test(name)) return cur
      if (ppid === null || ppid === 0 || ppid === cur) return null
      cur = ppid
    }
  } catch (_) {}
  return null
}

function findClaudePid(startPid = process.pid) {
  return process.platform === 'win32'
    ? findClaudePidWindows(startPid)
    : findClaudePidPosix(startPid)
}

function getAliveClaudePidsWindows() {
  const alive = new Set()
  try {
    const out = execSync(
      'powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -like \\"claude*.exe\\" } | Select-Object -ExpandProperty ProcessId"',
      { encoding: 'utf8', timeout: 10000, windowsHide: true },
    )
    for (const line of out.split(/\r?\n/)) {
      const t = line.trim()
      if (/^\d+$/.test(t)) alive.add(parseInt(t, 10))
    }
  } catch (_) {}
  return alive
}

function getAliveClaudePidsPosix() {
  const alive = new Set()
  try {
    if (!fs.existsSync('/proc')) return alive
    for (const name of fs.readdirSync('/proc')) {
      if (!/^\d+$/.test(name)) continue
      const comm = `/proc/${name}/comm`
      try {
        if (!fs.existsSync(comm)) continue
        const cn = fs.readFileSync(comm, 'utf8').trim()
        if (/^claude/i.test(cn)) alive.add(parseInt(name, 10))
      } catch (_) {}
    }
  } catch (_) {}
  return alive
}

function getAliveClaudePids() {
  return process.platform === 'win32'
    ? getAliveClaudePidsWindows()
    : getAliveClaudePidsPosix()
}

module.exports = { findClaudePid, getAliveClaudePids }
