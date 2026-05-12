#!/usr/bin/env node
/**
 * Create a Jira issue (Epic, Story, Sub-task, Task, Bug, etc.).
 *
 * Usage:
 *   node create-issue.js --type Story --summary "Story 3.1: ..." --parent PJIB-169 [--description "text"] [--labels "a,b"] [--priority Medium]
 *   node create-issue.js --type Epic --summary "Epic 3: ..." [--description "text"] [--labels "a,b"]
 *   node create-issue.js --type Sub-task --summary "3.1 - Task 1" --parent PJIB-190
 *
 * --description accepts plain text or simple markdown (## headings, - bullets).
 * --labels is comma-separated.
 *
 * Output: JSON { key, id, self }
 */

const { init } = require('./lib/jira-client')
const { parseArgs, requireArgs } = require('./lib/args')
const { markdownToAdf } = require('./lib/adf')

async function main() {
  const args = parseArgs(process.argv.slice(2))
  requireArgs(args, ['type', 'summary'],
    'node create-issue.js --type <Story|Epic|Sub-task|...> --summary "..." [--parent KEY] [--description "..."] [--labels "a,b"] [--priority Medium]')

  const { jira, config } = await init()
  const projectKey = args.project || config.project_key

  const fields = {
    project: { key: projectKey },
    issuetype: { name: args.type },
    summary: args.summary,
  }

  if (args.parent) fields.parent = { key: args.parent }
  if (args.description) fields.description = markdownToAdf(args.description)
  if (args.priority) fields.priority = { name: args.priority }
  if (args.labels) fields.labels = args.labels.split(',').map((l) => l.trim())

  const { data } = await jira.post('/issue', { fields })

  console.log(JSON.stringify({ key: data.key, id: data.id, self: data.self }))
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1) })
