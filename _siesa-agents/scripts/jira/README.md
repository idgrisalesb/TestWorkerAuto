# Jira CLI Scripts

Reusable Node.js scripts for Jira Cloud API operations. Zero external dependencies — uses native `fetch` (Node 18+).

## Setup

Scripts auto-discover config from:
- **OAuth tokens**: `.claude/commands/get-features/tokens.json`
- **OAuth config**: `.claude/commands/get-features/oauth-config.json`
- **Project config**: `_bmad-output/jira_docs/project_config.yaml` (fallback: `_bmad-output_bk/`)

Token refresh is automatic — scripts check expiry before each call.

## Scripts

### `search.js` — Search issues via JQL
```bash
node search.js --jql "project = PJIB AND issuetype = Epic" --fields "summary,status" --max 20
```

### `create-issue.js` — Create a single issue (Epic, Story, Sub-task, etc.)
```bash
node create-issue.js --type Epic --summary "Epic 3: Frontend" --labels "automated"
node create-issue.js --type Story --summary "Story 3.1: ..." --parent PJIB-169 --description "## AC\n- Item 1"
node create-issue.js --type Sub-task --summary "3.1 - Task 1" --parent PJIB-190
```

### `batch-create.js` — Batch-create issues from JSON
```bash
node batch-create.js --file issues.json
echo '[{"type":"Sub-task","summary":"Task 1","parent":"PJIB-190"}]' | node batch-create.js --stdin
```

### `transition.js` — Transition issues to a status (single or batch)
```bash
node transition.js --issue PJIB-190 --to done
node transition.js --issue "PJIB-190,PJIB-191,PJIB-192" --to done
node transition.js --issue PJIB-190 --to in-progress
```
Supported targets: `done`, `in-progress`, `todo`

### `get-issue.js` — Get issue details
```bash
node get-issue.js --issue PJIB-190 --fields "summary,status,subtasks"
```

### `edit-issue.js` — Update issue fields
```bash
node edit-issue.js --issue PJIB-190 --summary "New title" --labels "a,b"
```

### `add-comment.js` — Add a comment
```bash
node add-comment.js --issue PJIB-190 --body "## Sub-tasks\n- Task 1 done\n- Task 2 pending"
```

### `refresh-token.js` — Force token refresh
```bash
node refresh-token.js
```

## Library (`lib/`)

| Module | Purpose |
|---|---|
| `jira-client.js` | OAuth refresh, config loading, HTTP client factory |
| `adf.js` | Atlassian Document Format helpers (markdown → ADF) |
| `args.js` | CLI argument parser |

## Agent Usage

Instead of generating inline Node.js, agents call:
```bash
node _siesa-agents/scripts/jira/create-issue.js --type Story --summary "Story 3.1: ..." --parent PJIB-169
```
One line, deterministic, testable.
