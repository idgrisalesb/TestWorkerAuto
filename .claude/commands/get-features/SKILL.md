---
name: get-features
description: Interact with Jira REST API — generate project trees, query issues, fetch issue details, list projects, and more. Use when the user asks anything related to Jira projects, issues, trees or data from siesa-team or siesa-test-sandbox.argument-hint: [action] [PROJECT-KEY or ISSUE-KEY]
user-invocable: true
allowed-tools: Bash, Read, Write
---

Handle the Jira request: **$ARGUMENTS**

Determine the user's intent from the arguments and context. Common actions:
- `tree PROJECT-KEY` → generate hierarchical tree for that project
- `detail ISSUE-KEY` → fetch full detail for a specific issue
- `list` → list all available projects in all instances

If no explicit action is given, infer it from context. Default to **tree generation** if a project key is provided alone.

---

## Configuration

### Paths
| Resource | Path |
|----------|------|
| Working directory | `RUTA-PROJECT-ACTUAL` |
| Tree output | `_bmad-output/planning-artifacts/jira-trees/{PROJECT-KEY}-tree.md` |
| OAuth config | `.claude/commands/get-features/oauth-config.json` |
| Tokens | `.claude/commands/get-features/tokens.json` |
| OAuth login script | `.claude/commands/get-features/oauth-login.js` |

### Rules
- **Language:** all output content must be written in **English**
- **Jira instances:** resolved dynamically from `GET https://api.atlassian.com/oauth/token/accessible-resources` — do NOT hardcode cloud IDs

---

## Step 1 — Authenticate

### Check if the user is already logged in

Check whether the **Tokens** path (see Configuration) exists and has a `refresh_token`:
- **No `tokens.json` or no `refresh_token`** → the user has never logged in. Run the **OAuth login script** (see Configuration):
  ```
  node .claude/commands/get-features/oauth-login.js
  ```
  This opens the browser so the user can log in with their Jira credentials. Wait until `tokens.json` is created before proceeding. Inform the user:
  ```
  Opening browser for Jira login...
  Waiting for authentication to complete.
  ```

- **`tokens.json` exists with `refresh_token`** → silently refresh the access token using Node.js inline (`node -e "..."`):
  ```json
  { "grant_type": "refresh_token", "client_id": "...", "client_secret": "...", "refresh_token": "..." }
  ```
  Read credentials from **OAuth config** and token from **Tokens** (see Configuration paths).
  POST to `https://auth.atlassian.com/oauth/token` and save the new `access_token` (and `refresh_token` if returned) back to the **Tokens** file.

**Never use `/dev/stdin` — it does not work on Windows.**

---

## Step 2 — Select instance, then project (tree action only)

Use Node.js `readline` via a temporary `.js` file for each prompt, then delete the file.
readline pattern:
```js
const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
rl.question('', answer => { console.log(answer.trim()); rl.close(); });
```

### 2a — Read defaults from oauth-config.json

Before prompting, read `default_instance` and `default_project` from **OAuth config**.

- If **both** are set, display:
  ```
  Using saved defaults:
    Instance: {default_instance.name}  →  {default_instance.url}
    Project:  {default_project.key}  —  {default_project.name}

  Press Enter to confirm, or type a new selection:
  ```
  Prompt with readline. If the user presses Enter (empty), skip Steps 2b and 2c and use the saved values directly.
  If the user types anything, treat it as a new selection and proceed normally through 2b and 2c.

- If only `default_instance` is set, pre-select that instance silently and skip 2b (the instance prompt), but still prompt for the project (step 2c).

- If neither is set, proceed normally.

### 2b — Select instance

1. Call `GET https://api.atlassian.com/oauth/token/accessible-resources`.
   Returns: `[{ id, name, url }, ...]` — one entry per Jira site the user has access to.

2. Print and prompt:
   ```
   Available Jira instances:

     [1]  siesa-test-sandbox  →  https://siesa-test-sandbox.atlassian.net
     [2]  siesa-team          →  https://siesa-team.atlassian.net

   Select an instance (number):
   ```

3. Capture the user's input with readline. Resolve to a `{ id, name, url }` object.

### 2c — Select project

4. Fetch projects for the selected instance:
   `GET https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/project/search?maxResults=100`

5. Print and prompt:
   ```
   Projects in {instance name}:

     [1]  PJIB    — Prueba JIRA Integracion BMAD
     [2]  AAPERC  — AUTERP- Automatización Pruebas ERP
     ...

   Select a project (number or key):
   ```

6. Capture input with readline. Resolve to a project key and name.

### 2d — Save selection as default

After resolving both instance and project (whether newly selected or confirmed from defaults), update **OAuth config** using Node.js inline:
- Set `default_instance` to `{ "id": "...", "name": "...", "url": "..." }`
- Set `default_project` to `{ "key": "...", "name": "..." }`

Write the full updated JSON back to the file (preserve all other keys).

---

## Step 3 — Generate Tree

### Query Features

POST to `https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/search/jql`:
```json
{
  "jql": "project = KEY AND issuetype = Feature ORDER BY key ASC",
  "maxResults": 100,
  "fields": ["summary","status","priority","assignee","reporter","created","updated",
             "duedate","issuetype","parent","subtasks","labels","components",
             "fixVersions","issuelinks","customfield_10016","customfield_10020",
             "customfield_10022","customfield_10023","customfield_10070"]
}
```
**If no Features found:** retry with `issuetype = Epic`.
**If still no issues:** write a file noting the project has no issues.
**Pagination:** if `isLast: false`, fetch next pages using `nextPageToken` (never `startAt`).

### Fetch full detail per issue

For each key:
`GET https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/issue/{KEY}?fields=summary,status,priority,assignee,reporter,created,updated,duedate,issuetype,parent,subtasks,labels,components,fixVersions,issuelinks,customfield_10016,customfield_10020,customfield_10022,customfield_10023,customfield_10070`

### Write the tree file

Output path: **Tree output** from Configuration — replace `{PROJECT-KEY}` with the selected project key.

All text must be in **English**.

```markdown
# Project Tree — {KEY} — {Project Name}

**Instance:** {instance URL}
**Query date:** {YYYY-MM-DD}
**Features:** {count}

---

## Hierarchical Tree (up to Feature level)

├── 🔷 **KEY** (Feature) [Status] — Summary
└── 🔷 **KEY** (Feature) [Status] — Summary

---

## Feature Summary

| Key | Type | Summary | Status | Assignee |
|-----|------|---------|--------|----------|

---

## Detailed Information per Feature

> Data obtained via `GET /rest/api/3/issue/{KEY}` — {date}

### KEY — Summary

| Field | Value |
|-------|-------|
| Type | ... |
| Status | ... |
| Priority | ... |
| Assignee | ... |
| Reporter | ... |
| Created | YYYY-MM-DD |
| Updated | YYYY-MM-DD |
| Due date | ... |
| Target start | ... |
| Target end | ... |
| Story Points | ... |
| Parent (Subproyecto) | KEY — Summary |
| Labels | ... |
| Components | ... |
| Sprint | Name (state) |
| Child Epics | count (KEY, KEY, ...) |

**Description:**
{plain text from ADF — max 1000 chars}

**Related links:**
- {type}: **KEY** — Summary

---

> **Note:** Tree shows only Feature level. Epics, Stories, Tasks and Sub-tasks are not shown.
> API: `POST /rest/api/3/search/jql` — `GET /rest/api/3/issue/{KEY}`
```

---

## Action: Fetch Issue Detail

Call `GET /issue/{KEY}` with all available fields and display a formatted markdown summary with every non-null field. Convert ADF description to plain text.

---

## Action: List Projects

1. Call `GET https://api.atlassian.com/oauth/token/accessible-resources` to get all instances.
2. For each instance, call `GET /ex/jira/{cloudId}/rest/api/3/project/search?maxResults=100`.
3. Display grouped by instance, with columns: key, name, type.

---

## Important rules

- **Do NOT create persistent script files.** Use temporary `.js` files only if absolutely necessary and delete them immediately after use.
- **Always use Node.js** for API calls — Python may not be available.
- **ADF descriptions:** convert to plain text by recursively extracting `text` nodes. Truncate at 1000 chars.
- **Priority** may return a number (e.g., `3`) instead of a name — show it as-is.
- **Never commit or push** unless the user explicitly asks.
- **Trees show only Subproyecto and Feature levels** — never go deeper.