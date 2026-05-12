#!/usr/bin/env node
/**
 * Add a comment to a Jira issue.
 *
 * Usage:
 *   node add-comment.js --issue PJIB-190 --body "Comment text here"
 *   node add-comment.js --issue PJIB-190 --body "## Sub-tasks\n- Item 1\n- Item 2"
 *
 * --body accepts plain text or simple markdown.
 *
 * Output: JSON { id, self }
 */

const { init } = require('./lib/jira-client')
const { parseArgs, requireArgs } = require('./lib/args')
const { markdownToAdf } = require('./lib/adf')

async function main() {
  const args = parseArgs(process.argv.slice(2))
  requireArgs(args, ['issue', 'body'], 'node add-comment.js --issue <KEY> --body "text"')

  const { jira } = await init()

  const { data } = await jira.post(`/issue/${args.issue}/comment`, {
    body: markdownToAdf(args.body),
  })

  console.log(JSON.stringify({ id: data.id, self: data.self }))
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1) })
