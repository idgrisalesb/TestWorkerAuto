/**
 * Shared Jira API client — handles OAuth token refresh, config loading, and HTTP calls.
 * All CLI scripts import this module instead of reimplementing auth logic.
 *
 * Usage:
 *   const { jira, config } = await require('./lib/jira-client').init()
 *   const result = await jira.get('/search/jql', { body: ... })
 */

const fs = require('fs')
const path = require('path')

// Resolve project root (walk up until we find .git or CLAUDE.md)
function findProjectRoot(startDir) {
  let dir = startDir || process.cwd()
  while (dir !== path.parse(dir).root) {
    if (fs.existsSync(path.join(dir, '.git')) || fs.existsSync(path.join(dir, 'CLAUDE.md'))) return dir
    dir = path.dirname(dir)
  }
  return process.cwd()
}

const PROJECT_ROOT = findProjectRoot()

const PATHS = {
  tokens: path.join(PROJECT_ROOT, '.claude/commands/get-features/tokens.json'),
  oauthConfig: path.join(PROJECT_ROOT, '.claude/commands/get-features/oauth-config.json'),
  projectConfig: path.join(PROJECT_ROOT, '_bmad-output/jira_docs/project_config.yaml'),
  projectConfigBk: path.join(PROJECT_ROOT, '_bmad-output_bk/jira_docs/project_config.yaml'),
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
}

/** Simple YAML parser — covers flat key: "value" and key: value lines */
function parseSimpleYaml(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const result = {}
  const targetNames = []
  let inTargetNames = false

  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('#') || trimmed === '') {
      if (inTargetNames) inTargetNames = false
      continue
    }
    if (inTargetNames) {
      const match = trimmed.match(/^-\s*"?(.+?)"?\s*$/)
      if (match) { targetNames.push(match[1]); continue }
      else inTargetNames = false
    }
    const kv = trimmed.match(/^(\w[\w_]*):\s*(.*)$/)
    if (kv) {
      const [, key, rawVal] = kv
      if (key === 'target_names') { inTargetNames = true; continue }
      result[key] = rawVal.replace(/^["']|["']$/g, '')
    }
  }
  if (targetNames.length) result.target_names = targetNames
  return result
}

/** Load project config (try _bmad-output first, then _bk) */
function loadProjectConfig() {
  const configPath = fs.existsSync(PATHS.projectConfig) ? PATHS.projectConfig : PATHS.projectConfigBk
  if (!fs.existsSync(configPath)) throw new Error('No project_config.yaml found')
  return { ...parseSimpleYaml(configPath), _path: configPath }
}

/** Refresh OAuth access token if expired or about to expire */
async function refreshToken() {
  const tokens = loadJson(PATHS.tokens)
  const oauth = loadJson(PATHS.oauthConfig)

  // Skip refresh if token is still valid for 5+ minutes
  if (tokens.expires_at) {
    const expiresAt = new Date(tokens.expires_at).getTime()
    if (Date.now() < expiresAt - 5 * 60 * 1000) return tokens.access_token
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: oauth.client_id,
    client_secret: oauth.client_secret,
    refresh_token: tokens.refresh_token,
  })

  const res = await fetch('https://auth.atlassian.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  const data = await res.json()
  if (data.error) throw new Error(`Token refresh failed: ${data.error_description || data.error}`)

  const newTokens = {
    access_token: data.access_token,
    expires_in: data.expires_in,
    token_type: data.token_type,
    refresh_token: data.refresh_token || tokens.refresh_token,
    scope: data.scope || tokens.scope,
    obtained_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  }
  saveJson(PATHS.tokens, newTokens)
  return newTokens.access_token
}

/** Create a Jira API client bound to the project's cloud_id */
function createClient(accessToken, cloudId) {
  const baseUrl = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }

  async function request(method, endpoint, body) {
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`
    const opts = { method, headers }
    if (body) opts.body = JSON.stringify(body)

    const res = await fetch(url, opts)
    const text = await res.text()

    if (res.status === 204) return { ok: true, status: 204, data: null }

    let data
    try { data = JSON.parse(text) } catch { data = text }

    if (!res.ok) {
      const msg = data?.errorMessages?.join('; ') || data?.message || text
      const err = new Error(`Jira API ${res.status}: ${msg}`)
      err.status = res.status
      err.data = data
      throw err
    }
    return { ok: true, status: res.status, data }
  }

  return {
    get: (endpoint) => request('GET', endpoint),
    post: (endpoint, body) => request('POST', endpoint, body),
    put: (endpoint, body) => request('PUT', endpoint, body),
    delete: (endpoint) => request('DELETE', endpoint),
    baseUrl,
  }
}

/** Initialize: load config, refresh token, return client */
async function init() {
  const config = loadProjectConfig()
  const accessToken = await refreshToken()
  const client = createClient(accessToken, config.cloud_id)
  return { jira: client, config, PROJECT_ROOT, PATHS }
}

module.exports = { init, loadProjectConfig, refreshToken, createClient, parseSimpleYaml, findProjectRoot, PROJECT_ROOT, PATHS }
