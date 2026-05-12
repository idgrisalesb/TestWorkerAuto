---
name: 'step-05-stories'
description: 'Synchronize Stories and Sub-tasks from markdown to Jira, linked to their parent Epic'

# Path Definitions
workflow_path: '{project-root}/_siesa-agents/bmm/workflows/sync-epics-stories'

# File References
thisStepFile: '{workflow_path}/steps/step-05-stories.md'
storiesFolder: '{output_folder}/implementation-artifacts/'
epicsFolder: '{output_folder}/planning-artifacts/epics/'
configFile: '{project-root}/_bmad-output/jira_docs/project_config.yaml'

# Jira CLI Scripts (MUST use these — never write inline Node.js)
scriptsPath: '{project-root}/_siesa-agents/scripts/jira'

# OAuth Infrastructure (shared — scripts auto-discover these)
tokensFile: '{project-root}/.claude/commands/get-features/tokens.json'
oauthConfig: '{project-root}/.claude/commands/get-features/oauth-config.json'

# Templates
storyTemplate: '{project-root}/_siesa-agents/bmm/workflows/sync-epics-stories/data/templates/story-template.json'
taskTemplate: '{project-root}/_siesa-agents/bmm/workflows/sync-epics-stories/data/templates/task-template.json'
subtaskTemplate: '{project-root}/_siesa-agents/bmm/workflows/sync-epics-stories/data/templates/subtask-template.json'

---

# Step 5: Story Synchronization

## STEP GOAL:

Read story source files, resolve the parent Epic for each story, create missing Stories and Sub-tasks in Jira, and update the source files with Jira keys.

## MANDATORY EXECUTION RULES:

- 🛑 NEVER generate content without user input
- 📖 CRITICAL: Read the complete step file before taking any action
- 🔒 **API ONLY:** Use only Node.js direct API calls. NEVER use MCP tools, `fetch`, or `curl`.
- ⚠️ **EPIC RESOLUTION IS REQUIRED** for every story before any creation attempt.

---

## EXECUTION SEQUENCE:

### 1. Load Configuration and Templates

- Read `{configFile}` → extract `project_key`, `cloud_id`, `jira_url`.
- Read `{tokensFile}` → extract `access_token`.
- Read `{storyTemplate}`, `{taskTemplate}`, `{subtaskTemplate}`.
- Use `target_scope`, `target_names`, and `target_epic_files` from conversation memory (passed from Step 3).
  - If `target_scope` is `stories_specific`: only process stories whose title matches a name in `target_names`.
  - If `target_scope` is `epics_specific_with_stories`: use epic files to discover stories (see Section 3).
  - Otherwise: process all story files found in `{storiesFolder}`.

---

### 2. Pre-flight: Epic Parent Validation

**Skip this section entirely if `target_scope == epics_specific_with_stories`** — the parent Epics were just synced in Step 4 and their keys are already available.

Before processing any story, scan all story files to check that their parent Epics are already synced to Jira.

1. **For each story file in scope:**
   - Read the file and extract the referenced Parent Epic name.
   - Check the corresponding epic file in `{epicsFolder}` for a Jira key (e.g., `[PROJ-123]`).
   - If the Epic has no Jira key → mark it as `Unsynced`.

2. **If unsynced epics are detected:**

   ```
   ⚠️ CRITICAL: The following Parent Epic(s) are not yet synced to Jira.
      Stories cannot be linked without a valid Parent Epic Key.

   Unsynced epics:
     - {Epic Name 1}
     - {Epic Name 2}

   **Select an Option:**
   [S] Sync Epics first (go to Epic Synchronization)
   [E] Exit workflow
   ```

   - **IF S:** Load and execute `{workflow_path}/steps/step-04-epics.md`. After epics are done, resume this step.
   - **IF E:** Exit and terminate.

3. **If all parent epics are synced:** Proceed to Section 3.

---

### 3. Discover Story Sources

The discovery logic depends on `target_scope`:

#### Mode A — Standard (`stories`, `both`, `stories_specific`)

- Scan `{storiesFolder}/stories/` for all `*.md` files.
- Apply `target_names` filter if `target_scope == stories_specific`.
- Build a list of story files to process.

#### Mode B — From Epic File (`epics_specific_with_stories`)

For each epic file path listed in `target_epic_files`:

1. Read the epic file.
2. Parse all `#### Story X.Y: ...` sections within the targeted epic(s). Each section is a story to sync.
3. **For each story found in the epic file:**
   - **Check if an individual story file exists** in `{storiesFolder}/stories/` by matching the story ID pattern (e.g., `3-1-*.md` for Story 3.1).
     - **If individual file EXISTS:** Use that file as the source (it has full ACs, tasks, dev notes).
     - **If individual file DOES NOT EXIST:** Use the story section from the epic file as the source. Extract:
       - `Story Name` — from the H4 title (e.g., "Story 3.1: Microfrontend Setup + MasterCrud Shell + Mock Adapter")
       - `User Story` — the "As a / I want / So that" block (if present)
       - `Acceptance Criteria` — the **Given/When/Then** blocks or bullet list under "Acceptance Criteria"
       - `Tasks` — the bullet list under "Tasks:" (if present). **Note:** In this mode, tasks are synced as the story description in Jira only — do NOT create Sub-task issues from epic-file skeletons.
4. Build a unified list of story sources (mix of individual files and epic-file sections).

**IMPORTANT:** The `Parent_Epic_Key` for all stories in this mode is already known — it was just synced in Step 4. Extract it from the epic section header (e.g., `[PJIB-200]`) or from the Jira Sync block appended during Step 4.

---

### 4. For Each Story — Epic Resolution

**Execute for every story before any Jira operation.**

- If `target_scope == epics_specific_with_stories`: the `Parent_Epic_Key` is already known from Step 4 — extract it from the epic section header (e.g., `[PJIB-200]`) or from the Jira Sync block. **Skip directly to Section 5.**

#### Step 4.1 — Local Lookup

- Parse the story file to identify the referenced parent Epic (by name, ID, or section reference).
- Search the epic files in `{epicsFolder}` for a matching epic header that contains a Jira key `[KEY-123]`.
- **If found:** Extract the Epic's Jira key as `Parent_Epic_Key`. Proceed to Section 5.

#### Step 4.2 — Epic Not Found

Display:
```
⚠️ No parent Epic found for story '{story_title}'.
   This story cannot be synchronized without a parent Epic in Jira.
```

If there are **more stories remaining** in the current batch:

```
**Select an Option:**
[C] Skip this story and continue with the remaining ones
[S] Stop the entire synchronization
```

- **IF C:** Log the failure. Add to final report as `Failed`. Continue with next story.
- **IF S:** Stop. Display partial report. Exit step.

If this was the **last story**, log the failure and proceed to Section 7 (Report).

---

### 5. For Each Story — Idempotency Check and Creation

*(Execute only after a valid `Parent_Epic_Key` was resolved in Section 4)*

#### Step 5.1 — Local Idempotency Check

- Check if the story source already contains a `**Jira Issue Key:**` reference with a key pattern (for individual files), or `[KEY-123]` in the story section header (for epic-file skeletons).
- **If found (Already Synced):**
  - Extract the existing key.
  - Log: "Story '{story_title}' already synced as {KEY}."
  - **Skip Steps 5.2, 5.3, 5.4.**
  - **Proceed directly to Section 6 (Sub-task Sync) — only if `source_type == file`.**

#### Step 5.2 — Remote Idempotency Check

Using Node.js:

```
POST https://api.atlassian.com/ex/jira/{cloud_id}/rest/api/3/search/jql
Authorization: Bearer {access_token}
Body: {
  "jql": "project = \"{project_key}\" AND issuetype in (Story, Historia) AND summary ~ \"{story_name}\"",
  "maxResults": 5,
  "fields": ["id", "key", "summary"]
}
```

- **If found:** Set `KEY` = found key. Persist to file (Step 5.4). Skip Step 5.3. Proceed to Section 6.
- **If not found:** Proceed to Step 5.3.

#### Step 5.3 — Create Story in Jira

Using Node.js, `POST https://api.atlassian.com/ex/jira/{cloud_id}/rest/api/3/issue`:

- Build the request payload using `{storyTemplate}`.
- Inject values:
  - `{{project_key}}` → from config
  - `{{Story ID}}` → extracted from title (e.g., "3.1" from "Story 3.1: …")
  - `{{Story Name}}` → story title text
  - `{{user_story}}` → As a / I want / So that block
  - `{{acceptance_criteria}}` → Acceptance Criteria section
  - `{{dev_notes}}` → Dev Notes section (if present)
  - `{{file_path}}` → relative path of source file (or "epic-file-skeleton" for skeletons)
  - `{{Parent_Epic_Key}}` → resolved Epic key
  - `{{parent-epic-slug}}` → slugified epic name
- For **skeleton sources**: the description combines User Story + Acceptance Criteria + Tasks list (as text, NOT as sub-task issues).
- On success → extract new `key`.
- On API error → log failure. Offer [C] Continue / [S] Stop.

#### Step 5.4 — Immediate File Persistence (CRITICAL)

**Only for individual file sources (`source_type == file`):**

**Immediately** after obtaining the key (new or existing from 5.2), append to the story file:

```markdown

## Jira Information

**Jira Issue Key:** [{{KEY}}]({{jira_url}}/browse/{{KEY}})
**Jira URL:** {{jira_url}}/browse/{{KEY}}
**Status:** Synced
```

**Do not wait for the loop to finish.** Write to disk immediately.

---

### 6. For Each Story — Task & Sub-task Synchronization

**Only for individual file sources (`source_type == file`).** Skeleton sources do NOT create sub-tasks — skip this section entirely for them.

*(Execute for every file-sourced story that has a valid Jira KEY, regardless of whether it was just created or was already synced)*

**HIERARCHY MAPPING (source → Jira):**

```
Siesa-Agents (Markdown)          Jira
─────────────────────────        ─────────────────────
Story                        →   Story (issue)
  └─ Task (level-1 bullet)  →   Sub-task (child of Story)
       └─ Sub-task (nested)  →   Comment on that Sub-task
```

- **Level-1 bullets** (`- [ ] Task 1: …`) are created as **Sub-task issues** in Jira, children of the Story.
- **Nested bullets** (indented under a level-1 task) are **NOT** separate Jira issues. They are added as a **single comment** on the Sub-task created above.

#### Step 6.1 — Preparation

1. Read the `## Synced Tasks` table at the bottom of the story file (if it exists). Build a normalized set of already-synced task names.
2. Find the `## Tasks / Subtasks` section in the story file. If missing: Log "No Tasks section found in '{story_title}'." Proceed to next story.
3. **Parse the task tree:** Identify each level-1 bullet (task) and its nested/indented bullets (sub-tasks). A level-1 bullet starts with `- [ ]` or `- [x]` at the base indentation. Nested bullets are any lines indented further under that task.

**Example parsing from source file:**

```markdown
- [x] **Task 1: Scaffold MFE project** (AC: 1, 5)        ← LEVEL-1 → Jira Sub-task
  - [x] Create MfgStructureFrontend/ directory             ← NESTED  → Comment on Sub-task
  - [x] Initialize with pnpm create vite...                ← NESTED  → Comment on Sub-task
  - [x] Install vite-plugin-single-spa...                  ← NESTED  → Comment on Sub-task
```

#### Step 6.2 — Loop: For EACH Level-1 Task, Execute ALL Sub-steps Below

🛑 **CRITICAL:** Steps A through D below are executed **together as one atomic unit per task**, inside a single loop. Do NOT process all tasks first and then come back for comments. The comment MUST be created immediately after its parent Sub-task.

**For each level-1 task:**

##### A. Idempotency Check

- Is this task name already in the `## Synced Tasks` table? If YES → **skip this entire task (including comment)**. Move to the next level-1 task.

##### B. Create Sub-task in Jira

Using Node.js, `POST https://api.atlassian.com/ex/jira/{cloud_id}/rest/api/3/issue` with `{taskTemplate}`:
- Inject `{{Story ID}}`, `{{Task Name}}`, `{{project_key}}`, `{{Parent_Story_Key}}` (= story KEY).
- On success → extract `SubTaskKey` from the response.
- On failure → log error, offer [C] Continue / [S] Stop. If skipped, move to next task.

##### C. Add Nested Bullets as Comment on the Sub-task (MANDATORY if nested bullets exist)

🛑 **This step is NOT optional.** If the level-1 task has ANY nested/indented bullets, you MUST create a comment on the Sub-task created in step B. Skipping this step is a **SYSTEM FAILURE**.

1. Collect all nested bullets under the current level-1 task.
2. Strip checkbox syntax (`[ ]` / `[x]`) from each line — keep only the text content.
3. Create a comment on the Sub-task using Node.js:

```
POST https://api.atlassian.com/ex/jira/{cloud_id}/rest/api/3/issue/{SubTaskKey}/comment
Authorization: Bearer {access_token}
Content-Type: application/json
Body: {
  "body": {
    "type": "doc",
    "version": 1,
    "content": [
      {
        "type": "heading",
        "attrs": { "level": 3 },
        "content": [{ "type": "text", "text": "Sub-tasks" }]
      },
      {
        "type": "bulletList",
        "content": [
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [{ "type": "text", "text": "{{nested_bullet_text}}" }]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

- Build one `listItem` node per nested bullet from the source file.
- On API error → log warning but do NOT fail the entire task sync (the Sub-task was already created). Include the warning in the final report.

##### D. Immediate File Persistence

Append a row to the `## Synced Tasks` table in the story file (create table header if missing):

```markdown
| {{Task Name}} | [{{SubTaskKey}}]({{jira_url}}/browse/{{SubTaskKey}}) | Synced | {{Date}} |
```

**Then move to the next level-1 task and repeat from step A.**

---

### 7. Report Results

Display summary:

```
**Story Synchronization Complete**
✅ Stories Created:    X  (file: F, skeleton: S)
⏭️  Stories Skipped:   Y  (already existed)
❌ Stories Failed:     Z  (epic not found or API error)
📎 Sub-tasks Created:  W
💬 Comments Added:     V  (nested bullets → Sub-task comments)
⚠️  Comments Failed:   U  (API error — Sub-task exists but comment missing)
```

For each story, show: `[status] Story {id}: {name} → {KEY or error reason}`

List each failure with its reason. For comment failures, include the Sub-task key so the user can manually add the comment.

---

### 8. Present MENU OPTIONS

Display: "**Select an Option:** [C] Finish"

#### Menu Handling Logic:

- **IF C:** Display "✅ Workflow Complete. All artifacts synchronized." and exit.

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- All processed stories have a resolved parent Epic key
- No duplicate stories or sub-tasks created
- Story files updated immediately after each sync
- Nested bullets (sub-tasks in source) added as **comments** on the Jira Sub-task (NOT as separate issues)
- Comment body uses Atlassian Document Format (ADF) as required by Jira Cloud API v3
- Skeleton sources create only the Story issue (no sub-tasks)
- Failed stories logged in final report

### ❌ SYSTEM FAILURE:

- Creating a Story without a resolved `Parent_Epic_Key`
- Creating nested bullets (source sub-tasks) as separate Jira issues instead of comments
- **Skipping the comment creation step** when a level-1 task has nested bullets — this is the most common failure mode
- Processing all Sub-tasks first and then adding comments as a second pass (comments MUST be created immediately after each Sub-task)
- Creating Sub-task issues from skeleton sources (skeletons only create the Story)
- Sending comment body as plain text instead of ADF format
- Using MCP tools
- Waiting until the loop ends to write file updates

**Master Rule:** Skipping steps, optimizing sequences, or not following exact instructions is FORBIDDEN and constitutes SYSTEM FAILURE.
