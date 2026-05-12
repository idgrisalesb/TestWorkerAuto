#!/usr/bin/env node
/**
 * Edit/update fields on an existing Jira issue.
 *
 * Usage:
 *   node edit-issue.js --issue PJIB-190 --summary "New title"
 *   node edit-issue.js --issue PJIB-190 --description "Updated description"
 *   node edit-issue.js --issue PJIB-190 --labels "label1,label2"
 *   node edit-issue.js --issue PJIB-190 --priority High
 *
 * Output: JSON { key, status }
 */

const { init } = require('./lib/jira-client')
const { parseArgs, requireArgs } = require('./lib/args')
const { markdownToAdf } = require('./lib/adf')

async function main() {
  const args = parseArgs(process.argv.slice(2))
  requireArgs(args, ['issue'], 'node edit-issue.js --issue <KEY> [--summary "..."] [--description "..."] [--labels "a,b"] [--priority Medium]')

  const fields = {}
  if (args.summary) fields.summary = args.summary
  if (args.description) fields.description = markdownToAdf(args.description)
  if (args.labels) fields.labels = args.labels.split(',').map((l) => l.trim())
  if (args.priority) fields.priority = { name: args.priority }

  if (Object.keys(fields).length === 0) {
    console.error('Error: provide at least one field to update (--summary, --description, --labels, --priority)')
    process.exit(1)
  }

  const { jira } = await init()
  await jira.put(`/issue/${args.issue}`, { fields })

  console.log(JSON.stringify({ key: args.issue, status: 'updated' }))
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1) })
