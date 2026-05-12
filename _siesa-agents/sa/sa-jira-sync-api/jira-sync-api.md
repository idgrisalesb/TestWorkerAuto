---
name: jira-sync-api
description: Query Jira and return a minimal hierarchy of Epics → Stories → Subtasks for a given project and epic status. Returns only id, key, name, and status for each level. Use when the user needs to inspect or export the epic/story/subtask structure from siesa-team or siesa-test-sandbox.
---

Handle the Jira sync request: **$ARGUMENTS**

Parse arguments:
- First positional arg → `PROJECT_KEY` (e.g. `PPS`)
- `--status "..."` → filter epics by this status name (default: `En curso`)
- If no `PROJECT_KEY` is provided, prompt the user for one.

---

## Configuration

### Paths
| Resource | Path |
|----------|------|
| Working directory | `RUTA-PROJECT-ACTUAL` |
| Output file | `_bmad-output/planning-artifacts/jira-sync/{PROJECT-KEY}-sync.md` |
| OAuth config | `.claude/commands/get-features/oauth-config.json` |
| Tokens | `.claude/commands/get-features/tokens.json` |
| OAuth login script | `.claude/commands/get-features/oauth-login.js` |

### Minimal fields extracted per level
| Level | Fields kept |
|-------|-------------|
| Epic | `id`, `key`, `summary` (name), `status.name` |
| Story | `id`, `key`, `summary` (name), `status.name` |
| Subtask | `id`, `key`, `summary` (name), `status.name` |

> All other fields returned by the API (self, avatarUrls, iconUrl, project, assignee,
> description, statusCategory, priority, expand, etc.) are **discarded immediately**
> after the HTTP response is received — never written to disk or displayed.

---

## Step 1 — Authenticate

Reuse the existing OAuth infrastructure from `get-features`:

Check whether **Tokens** path exists and contains a `refresh_token`:

- **No `tokens.json` or no `refresh_token`** → run the login script:
  ```
  node .claude/commands/get-features/oauth-login.js
  ```
  Wait until `tokens.json` is created. Inform the user:
  ```
  Opening browser for Jira login...
  Waiting for authentication to complete.
  ```

- **`tokens.json` exists with `refresh_token`** → silently refresh using Node.js inline:
  ```js
  // Read oauth-config.json and tokens.json
  // POST https://auth.atlassian.com/oauth/token
  // Body: { grant_type, client_id, client_secret, refresh_token }
  // Save new access_token (and refresh_token if returned) back to tokens.json
  ```

**Never use `/dev/stdin` — it does not work on Windows.**

---

## Step 2 — Resolve instance

Call `GET https://api.atlassian.com/oauth/token/accessible-resources`.

- Read `default_instance` from **OAuth config**.
- If set, use it silently (no prompt).
- If not set, list instances and prompt the user to select one using a temporary readline `.js` file (delete after use).

Save or confirm `default_instance` in **OAuth config** after resolution.

---

## Step 3 — Resolve project

- If `PROJECT_KEY` was provided as an argument → use it directly, no prompt.
- If not provided → fetch projects for the instance:
  ```
  GET https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/project/search?maxResults=100
  ```
  Display list and prompt with readline. Save selection as `default_project` in **OAuth config**.

---

## Step 4 — Fetch Epics (filtered by status)

```
POST https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/search/jql
```
```json
{
  "jql": "project = {KEY} AND issuetype = Epic AND status = \"{EPIC_STATUS}\" ORDER BY key ASC",
  "maxResults": 50,
  "fields": ["id", "key", "summary", "status"]
}
```

**Pagination:** if `isLast: false`, fetch next pages using `nextPageToken`.

**Strip immediately** — for each issue in the response, extract only:
```js
const epic = {
  id:     issue.id,
  key:    issue.key,
  name:   issue.fields.summary,
  status: issue.fields.status.name
};
```
Discard everything else. Build `epics[]` array.

If no epics are found for the given status, inform the user and exit.

---

## Step 5 — Fetch Stories per Epic

For each epic key, query its direct children that are Stories:

```
POST https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/search/jql
```
```json
{
  "jql": "project = {KEY} AND issuetype = Story AND parent = {EPIC_KEY} ORDER BY key ASC",
  "maxResults": 100,
  "fields": ["id", "key", "summary", "status", "subtasks"]
}
```

**Pagination:** handle `nextPageToken` if `isLast: false`.

**Strip immediately:**
```js
const story = {
  id:       issue.id,
  key:      issue.key,
  name:     issue.fields.summary,
  status:   issue.fields.status.name,
  subtasks: (issue.fields.subtasks ?? []).map(s => ({
    id:  s.id,
    key: s.key
    // name and status fetched in Step 6
  }))
};
```

> **Note:** If your project uses Tasks instead of Stories at this level, replace
> `issuetype = Story` with `issuetype in (Story, Task)` — adjust per project convention.

---

## Step 6 — Fetch Subtask details

The `subtasks` array from Step 5 only provides `id` and `key` (Jira does not return
`summary` or `status` for subtasks inline without a full issue fetch).

Batch-fetch subtask details using JQL on their keys:

```
POST https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/search/jql
```
```json
{
  "jql": "issuekey in ({KEY1}, {KEY2}, ...) ORDER BY key ASC",
  "maxResults": 100,
  "fields": ["id", "key", "summary", "status"]
}
```

Group subtask keys in batches of up to 50 per request to stay within JQL limits.

**Strip immediately:**
```js
const subtask = {
  id:     issue.id,
  key:    issue.key,
  name:   issue.fields.summary,
  status: issue.fields.status.name
};
```

---

## Step 7 — Assemble and write output

Build the final structure in memory:

```
epics[]
  └── stories[]
        └── subtasks[]
```

Write to **Output file** (replace `{PROJECT-KEY}` in path):

```markdown
# Jira Sync — {PROJECT-KEY} — {Project Name}

**Instance:** {instance URL}
**Epic status filter:** {EPIC_STATUS}
**Query date:** {YYYY-MM-DD HH:MM}
**Epics:** {count} | **Stories:** {count} | **Subtasks:** {count}

---

## {EPIC-KEY} — {Epic Name}
**ID:** {id} | **Status:** {status}

### {STORY-KEY} — {Story Name}
**ID:** {id} | **Status:** {status}

#### {SUBTASK-KEY} — {Subtask Name}
**ID:** {id} | **Status:** {status}

---
```

Repeat the Epic → Story → Subtask block for every epic found.

After writing, print to the user:
```
✅ Sync complete.
   File: _bmad-output/planning-artifacts/jira-sync/{PROJECT-KEY}-sync.md
   Epics: X  |  Stories: Y  |  Subtasks: Z
```

---

## Important rules

- **Language:** output file content must be written in **English**.
- **Minimal data only:** never write `self`, `avatarUrls`, `iconUrl`, `description`,
  `assignee`, `priority`, `statusCategory`, `expand`, `project`, or any other field
  beyond `id`, `key`, `name (summary)`, and `status` to the output or to memory longer
  than the immediate strip step.
- **No persistent temp files:** use temporary `.js` files only for readline prompts;
  delete immediately after use.
- **Always Node.js** for API calls — do not assume Python is available.
- **Never commit or push** unless the user explicitly asks.
- **Subtask ≠ Task:** this command targets `issuetype = Subtask` (children of Stories),
  not standalone Tasks at the story level.
