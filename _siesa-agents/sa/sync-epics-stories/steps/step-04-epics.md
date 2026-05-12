---
name: 'step-04-epics'
description: 'Synchronize Epics from markdown to Jira as children of their resolved Feature parent'

# Path Definitions
workflow_path: '{project-root}/_siesa-agents/bmm/workflows/sync-epics-stories'

# File References
thisStepFile: '{workflow_path}/steps/step-04-epics.md'
nextStepStories: '{workflow_path}/steps/step-05-stories.md'
epicsFolder: '{output_folder}/planning-artifacts/epics/'
prdFolder: '{output_folder}/planning-artifacts/prd/'
configFile: '{project-root}/_bmad-output/jira_docs/project_config.yaml'

# Jira CLI Scripts (MUST use these — never write inline Node.js)
scriptsPath: '{project-root}/_siesa-agents/scripts/jira'

# OAuth Infrastructure (shared — scripts auto-discover these)
tokensFile: '{project-root}/.claude/commands/get-features/tokens.json'
oauthConfig: '{project-root}/.claude/commands/get-features/oauth-config.json'

# Template
epicTemplate: '{project-root}/_siesa-agents/bmm/workflows/sync-epics-stories/data/templates/epic-template.json'

---

# Step 4: Epic Synchronization

## STEP GOAL:

Read epic source files, resolve the parent Feature for each epic, create missing Epics in Jira as children of their Feature, and update the source files with Jira keys.

## MANDATORY EXECUTION RULES:

- 🛑 NEVER generate content without user input
- 📖 CRITICAL: Read the complete step file before taking any action
- 🔒 **API ONLY:** Use only Node.js direct API calls. NEVER use MCP tools, `fetch`, or `curl`.
- ⚠️ **FEATURE RESOLUTION IS REQUIRED** for every epic before any creation attempt.
- 🏗️ **FIXED HIERARCHY:** Epics are always children of a Feature. There is no fallback to project-level creation.
- 🚫 **NEVER search Jira to resolve Features.** The source of truth is the local markdown files (`FEATURE_CODE_JIRA`). If missing, ask the user.

---

## EXECUTION SEQUENCE:

### 1. Load Configuration and Templates

- Read `{configFile}` → extract `project_key`, `cloud_id`, `jira_url`.
- Read `{tokensFile}` → extract `access_token`.
- Read `{epicTemplate}` → load the creation payload template.
- Read `target_scope` and `target_names` from config (passed in memory from Step 3).

---

### 2. Discover Epic Source Files

- Scan `{epicsFolder}` for all `*.md` files.
- For each file, parse ALL `### Epic N:` headers (H3). Each header is one epic.
- **Filter:** If `target_scope` is `epics_specific` or `epics_specific_with_stories`, match each epic H3 title against `target_names` (by name, number, or partial match). **Only process matching epics. Ignore all others.**
- If `target_scope` is `epics` or `both`: process ALL epics found across all files.
- Build a list of `{ epic_title, epic_section_content, source_file_path }` to process.

🛑 **CRITICAL:** A single file (e.g., `metodos-epics.md`) may contain multiple epics (Epic 2, Epic 3, Epic 4). When the user says "sync Epic 3", you MUST only sync Epic 3 — NOT all epics in that file.

---

### 3. For Each Epic — Feature Resolution (CRITICAL)

**This section must be executed for EVERY epic before attempting any Jira operation.**

#### Step 3.1 — Search in Epic File Frontmatter

- Read the epic markdown file.
- Check YAML frontmatter for `FEATURE_CODE_JIRA` or `FEATURE_ID`.
  - **If found:** Use it directly as the `Parent_Key` for creation. Skip to Section 4.
  - **If not found:** Proceed to Step 3.2.

#### Step 3.2 — Search in PRD Files

- Scan all `*.md` files in `{prdFolder}`.
- For each PRD file, search for a `FEATURE_CODE_JIRA` marker associated with the current epic (by matching the Feature name or section that references the epic).
  - **If a `FEATURE_CODE_JIRA` is found:** Use it as the `Parent_Key`. Skip to Section 4.
  - **If not found:** Proceed to Step 3.3.

#### Step 3.3 — Ask User for Feature ID (MANDATORY)

**The source of truth are the local markdown files. NEVER search Jira for Feature matches.**

If no `FEATURE_CODE_JIRA` was found in the epic file or PRD files, display:

```
⚠️ No Feature ID (FEATURE_CODE_JIRA) found for epic '{epic_title}'.
   The markdown source files do not contain a Jira Feature ID for this epic.

   Please provide the Jira Feature ID (e.g., PROJ-99) for this epic,
   or enter [S] to skip this epic / [X] to stop the entire synchronization.
```

**Input handling:**

- **If the user provides a valid key (e.g., `PROJ-99`):**
  - Use it as `Parent_Key`.
  - **Persist in ALL related artifacts (CRITICAL):**
    1. **Epic file:** Write `FEATURE_CODE_JIRA: {key}` into the epic source file YAML frontmatter.
    2. **PRD file:** Locate the corresponding PRD file by checking the epic's `inputDocuments` frontmatter field or by matching the `feature` name against PRD files in `{prdFolder}`. Write `FEATURE_CODE_JIRA: {key}` into that PRD file's YAML frontmatter if not already present.
  - Proceed to Section 4.
- **If [S]:** Log the failure. Add to the final report as `Skipped — missing FEATURE_CODE_JIRA`. Continue with the next epic.
- **If [X]:** Stop. Display partial report of what was processed so far. Exit step.

If this was the **last epic** and the user chose [S], proceed to Section 5 (Report).

---

### 4. For Each Epic — Idempotency Check and Creation

*(Execute only after a valid `Parent_Key` was resolved in Section 3)*

#### Step 4.1 — Local Idempotency Check

- Check if the epic's section header in the markdown file already contains a Jira key pattern (e.g., `[PROJ-123]`).
- **If found:** Skip creation. Log the existing key. Proceed to next epic.

#### Step 4.2 — Remote Idempotency Check

Using Node.js, call:

```
POST https://api.atlassian.com/ex/jira/{cloud_id}/rest/api/3/search/jql
Authorization: Bearer {access_token}
Body: {
  "jql": "project = \"{project_key}\" AND issuetype = Epic AND summary ~ \"{epic_name}\"",
  "maxResults": 5,
  "fields": ["id", "key", "summary"]
}
```

- **If found:** Skip creation. Log the existing key. Update the source file with the found key (Step 4.4). Proceed to next epic.
- **If not found:** Proceed to Step 4.3.

#### Step 4.3 — Create Epic in Jira

Using Node.js, `POST https://api.atlassian.com/ex/jira/{cloud_id}/rest/api/3/issue`:

- Build the request payload using `{epicTemplate}`.
- Inject values:
  - `{{project_key}}` → `project_key` from config
  - `{{Epic Number}}` → extracted from epic section title (e.g., "1" from "Epic 1: …")
  - `{{Epic Name}}` → epic title text
  - `{{goal}}` → first paragraph / goal text of the epic section
  - `{{description}}` → acceptance criteria block
  - `{{file_path}}` → relative path of the source file
  - `{{epic-slug}}` → slugified epic name
  - `{{Parent_Key}}` → the Feature key resolved in Section 3
- ⚠️ `issueTypeName` MUST be exactly `"Epic"`. Do NOT translate to "Épica" or any other language.
- On success → extract the new `key` from the response.
- On API error → log failure. Offer [C] Continue / [S] Stop (same as Section 3.4).

#### Step 4.4 — Immediate File Persistence (CRITICAL)

**Immediately** after obtaining the key (new or existing), update the source epic file:

1. Append `[KEY]` to the epic section header line.
2. Append the following block at the end of that epic's section:

```markdown
> **Jira Sync:** [{{KEY}}]({{jira_url}}/browse/{{KEY}}) | Status: Synced | Feature Parent: {{Parent_Key}}
```

**Do not wait for the loop to finish.** Write to disk immediately so partial progress is never lost.

---

### 5. Report Results

Display summary:

```
**Epic Synchronization Complete**
✅ Created:  X
⏭️  Skipped:  Y  (already existed)
❌ Failed:   Z  (feature not found or API error)
```

List each failure with its reason.

---

### 6. Determine Next Step

- If `target_scope` is `epics_specific_with_stories` → **do NOT show menu**. Display `🔄 Sincronizando historias de la(s) épica(s)...` and immediately load, read entire file, then execute `{nextStepStories}`.
- If `target_scope` is `both` → proceed to stories menu below.
- Otherwise → finish.

---

### 7. Present MENU OPTIONS

**Skip this section if `target_scope == epics_specific_with_stories`** (already handled in Section 6).

Display: "**Select an Option:** [C] Continue"

#### Menu Handling Logic:

- **IF C:**
  - If scope == `both`: Load, read entire file, then execute `{nextStepStories}`.
  - Else: Display "✅ Workflow Complete. Epics synchronized." and exit.

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- All processed epics have a resolved Feature parent
- No duplicate epics created in Jira
- Source epic files updated immediately after each sync
- Failed epics logged in final report

### ❌ SYSTEM FAILURE:

- Creating an Epic without a resolved `Parent_Key` (Feature)
- Searching Jira to resolve a Feature parent (NEVER allowed — use only local files or ask the user)
- Using MCP tools
- Waiting until the loop ends to write file updates

**Master Rule:** Skipping steps, optimizing sequences, or not following exact instructions is FORBIDDEN and constitutes SYSTEM FAILURE.
