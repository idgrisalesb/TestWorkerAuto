#!/usr/bin/env node
/**
 * Batch-create Jira issues from a JSON file or stdin.
 * Reuses create-issue logic for each entry.
 *
 * Usage:
 *   node batch-create.js --file issues.json
 *   echo '[{"type":"Sub-task","summary":"Task 1","parent":"PJIB-190"}]' | node batch-create.js --stdin
 *
 * Input format (JSON array):
 *   [
 *     { "type": "Story", "summary": "Story 3.1: ...", "parent": "PJIB-169", "description": "...", "labels": "a,b" },
 *     { "type": "Sub-task", "summary": "3.1 - Task 1", "parent": "PJIB-190" },
 *     ...
 *   ]
 *
 * Output: JSON array of { key, summary, status } per created issue
 */

const { init } = require('./lib/jira-client')
const { parseArgs } = require('./lib/args')
const { markdownToAdf } = require('./lib/adf')
const fs = require('fs')

async function main() {
  const args = parseArgs(process.argv.slice(2))

  let items
  if (args.file) {
    items = JSON.parse(fs.readFileSync(args.file, 'utf8'))
  } else if (args.stdin) {
    const chunks = []
    for await (const chunk of process.stdin) chunks.push(chunk)
    items = JSON.parse(Buffer.concat(chunks).toString())
  } else {
    console.error('Usage: node batch-create.js --file <path.json> OR --stdin')
    process.exit(1)
  }

  if (!Array.isArray(items)) { console.error('Error: input must be a JSON array'); process.exit(1) }

  const { jira, config } = await init()
  const projectKey = config.project_key
  const results = []

  for (const item of items) {
    const fields = {
      project: { key: projectKey },
      issuetype: { name: item.type },
      summary: item.summary,
    }
    if (item.parent) fields.parent = { key: item.parent }
    if (item.description) fields.description = markdownToAdf(item.description)
    if (item.priority) fields.priority = { name: item.priority }
    if (item.labels) fields.labels = (typeof item.labels === 'string' ? item.labels.split(',') : item.labels).map((l) => l.trim())

    try {
      const { data } = await jira.post('/issue', { fields })
      results.push({ key: data.key, summary: item.summary, status: 'created' })
    } catch (e) {
      results.push({ key: null, summary: item.summary, status: 'FAILED', error: e.message })
    }
  }

  console.log(JSON.stringify(results, null, 2))
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1) })
