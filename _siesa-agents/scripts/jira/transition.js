#!/usr/bin/env node
/**
 * Transition a Jira issue to a target status category.
 *
 * Usage:
 *   node transition.js --issue PJIB-190 --to done
 *   node transition.js --issue PJIB-190 --to in-progress
 *   node transition.js --issue "PJIB-190,PJIB-191,PJIB-192" --to done   # batch mode
 *
 * --to accepts: done, in-progress, todo (maps to Jira status category keys)
 * --issue accepts a single key or comma-separated keys for batch transitions.
 *
 * Output: JSON array of { key, status, transitionUsed } per issue
 */

const { init } = require('./lib/jira-client')
const { parseArgs, requireArgs } = require('./lib/args')

const STATUS_CATEGORY_MAP = {
  'done': 'done',
  'in-progress': 'indeterminate',
  'todo': 'new',
}

// Fallback: match transition name if category key doesn't match
const STATUS_NAME_PATTERNS = {
  'done': /done|finalizada|listo|cerrad/i,
  'in-progress': /progress|curso|desarroll/i,
  'todo': /to\s?do|por\s?hacer|backlog|nuevo/i,
}

async function transitionIssue(jira, issueKey, targetStatus) {
  const { data } = await jira.get(`/issue/${issueKey}/transitions`)
  const transitions = data.transitions || []

  const categoryKey = STATUS_CATEGORY_MAP[targetStatus]
  const namePattern = STATUS_NAME_PATTERNS[targetStatus]

  // Try category match first, then name match
  const match = transitions.find((t) => t.to?.statusCategory?.key === categoryKey)
    || transitions.find((t) => namePattern && namePattern.test(t.to?.name || ''))
    || transitions.find((t) => namePattern && namePattern.test(t.name || ''))

  if (!match) {
    const available = transitions.map((t) => `${t.name} (${t.to?.name})`).join(', ')
    throw new Error(`No '${targetStatus}' transition for ${issueKey}. Available: ${available}`)
  }

  await jira.post(`/issue/${issueKey}/transitions`, { transition: { id: match.id } })

  return { key: issueKey, status: match.to?.name || targetStatus, transitionUsed: match.name }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  requireArgs(args, ['issue', 'to'],
    'node transition.js --issue <KEY|KEY,KEY,...> --to <done|in-progress|todo>')

  if (!STATUS_CATEGORY_MAP[args.to]) {
    console.error(`Error: --to must be one of: ${Object.keys(STATUS_CATEGORY_MAP).join(', ')}`)
    process.exit(1)
  }

  const { jira } = await init()
  const keys = args.issue.split(',').map((k) => k.trim())
  const results = []

  for (const key of keys) {
    try {
      const result = await transitionIssue(jira, key, args.to)
      results.push(result)
    } catch (e) {
      results.push({ key, status: 'FAILED', error: e.message })
    }
  }

  console.log(JSON.stringify(results, null, 2))
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1) })
