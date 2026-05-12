#!/usr/bin/env node
/**
 * Get a Jira issue by key with selected fields.
 *
 * Usage:
 *   node get-issue.js --issue PJIB-190 [--fields "summary,status,subtasks,parent"]
 *
 * Output: JSON { key, summary, status, subtasks, parent, ... }
 */

const { init } = require('./lib/jira-client')
const { parseArgs, requireArgs } = require('./lib/args')

async function main() {
  const args = parseArgs(process.argv.slice(2))
  requireArgs(args, ['issue'], 'node get-issue.js --issue <KEY> [--fields "summary,status,subtasks"]')

  const fields = args.fields || 'summary,status,subtasks,parent,issuetype'

  const { jira } = await init()
  const { data } = await jira.get(`/issue/${args.issue}?fields=${fields}`)

  const result = { key: data.key, id: data.id }
  if (data.fields?.summary) result.summary = data.fields.summary
  if (data.fields?.status) result.status = data.fields.status.name
  if (data.fields?.issuetype) result.type = data.fields.issuetype.name
  if (data.fields?.parent) result.parent = { key: data.fields.parent.key, summary: data.fields.parent.fields?.summary }
  if (data.fields?.subtasks) {
    result.subtasks = data.fields.subtasks.map((s) => ({
      key: s.key,
      summary: s.fields?.summary,
      status: s.fields?.status?.name,
    }))
  }

  console.log(JSON.stringify(result, null, 2))
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1) })
