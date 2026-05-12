#!/usr/bin/env node
/**
 * Search Jira issues via JQL.
 *
 * Usage:
 *   node search.js --jql "project = PJIB AND issuetype = Epic" [--fields "summary,status"] [--max 20]
 *
 * Output: JSON array of { key, summary, status, ...fields }
 */

const { init } = require('./lib/jira-client')
const { parseArgs, requireArgs } = require('./lib/args')

async function main() {
  const args = parseArgs(process.argv.slice(2))
  requireArgs(args, ['jql'], 'node search.js --jql "<JQL>" [--fields "summary,status"] [--max 20]')

  const fields = (args.fields || 'summary,status,subtasks').split(',').map((f) => f.trim())
  const maxResults = parseInt(args.max || '20', 10)

  const { jira } = await init()

  const { data } = await jira.post('/search/jql', {
    jql: args.jql,
    fields,
    maxResults,
  })

  const issues = (data.issues || []).map((issue) => {
    const result = { key: issue.key }
    for (const field of fields) {
      if (field === 'status') result.status = issue.fields?.status?.name
      else if (field === 'subtasks') {
        result.subtasks = (issue.fields?.subtasks || []).map((s) => ({
          key: s.key,
          summary: s.fields?.summary,
          status: s.fields?.status?.name,
        }))
      } else result[field] = issue.fields?.[field]
    }
    return result
  })

  console.log(JSON.stringify(issues, null, 2))
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1) })
