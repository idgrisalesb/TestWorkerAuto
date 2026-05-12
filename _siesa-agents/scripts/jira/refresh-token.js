#!/usr/bin/env node
/**
 * Force-refresh the OAuth access token and print the result.
 * Useful for debugging auth issues or pre-warming before a batch.
 *
 * Usage:
 *   node refresh-token.js
 *
 * Output: JSON { expires_at, status }
 */

const path = require('path')
const fs = require('fs')
const { PATHS, findProjectRoot } = require('./lib/jira-client')

async function main() {
  const tokens = JSON.parse(fs.readFileSync(PATHS.tokens, 'utf8'))
  const oauth = JSON.parse(fs.readFileSync(PATHS.oauthConfig, 'utf8'))

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
  fs.writeFileSync(PATHS.tokens, JSON.stringify(newTokens, null, 2))

  console.log(JSON.stringify({ status: 'refreshed', expires_at: newTokens.expires_at }))
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1) })
