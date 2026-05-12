---
name: 'step-03-scope'
description: 'Select synchronization scope: all epics, all stories, both, or specific items'

# Path Definitions
workflow_path: '{project-root}/_siesa-agents/bmm/workflows/sync-epics-stories'

# File References
thisStepFile: '{workflow_path}/steps/step-03-scope.md'
stepEpics: '{workflow_path}/steps/step-04-epics.md'
stepStories: '{workflow_path}/steps/step-05-stories.md'
outputFile: '{project-root}/_bmad-output/jira_docs/project_config.yaml'

# Source paths
epicsFolder: '{output_folder}/planning-artifacts/epics/'
storiesFolder: '{output_folder}/implementation-artifacts/'

---

# Step 3: Scope Selection

## STEP GOAL:

To determine the exact scope of synchronization: all epics, all stories, both, or specific named items.

## MANDATORY EXECUTION RULES:

- 🛑 **STOP AND WAIT:** You MUST halt execution at the menu options. Do NOT proceed until the user explicitly selects an option.
- 🛑 **NO AUTO-PILOT:** Even if you "think" you know what the user wants based on available files, you MUST ask.
- 📖 **READ FIRST:** Read the complete step file before taking any action.

---

## EXECUTION SEQUENCE:

### 1. Present Options

Display the following menu to the user:

```
**Select Synchronization Scope:**

1. Epics Only           — Syncs all epics from source files → Jira Epics
2. Stories & Tasks      — Syncs all stories → Jira Stories & Sub-tasks (requires Parent Epics to exist in Jira)
3. Both                 — Syncs Epics first, then Stories & Tasks
4. Specific Epic(s)     — Sync one or more named epics (and their stories if present)
5. Specific Story(ies)  — Sync one or more named stories (and their sub-tasks if present)
```

---

### 2. Handle Selection — Options 1, 2, 3

**Do NOT write scope to `{outputFile}`.** Keep `target_scope` in conversation memory only.

**Option 1 (Epics Only):**
- Set `target_scope: epics` in memory.
- Load `{stepEpics}`. Signal: after epics → Finish (not chain to stories).

**Option 2 (Stories & Tasks):**
- Set `target_scope: stories` in memory.
- Load `{stepStories}`.

**Option 3 (Both):**
- Set `target_scope: both` in memory.
- Load `{stepEpics}`. Signal: after epics → chain to `{stepStories}`.

---

### 3. Handle Selection — Option 4 (Specific Epic(s))

1. Ask the user: "Which epic(s) do you want to sync? Enter their names or numbers separated by commas (e.g., 'Epic 3' or '3')."
2. Wait for user input (one or more names/numbers).
3. **Validate:** Search for each name in the markdown files inside `{epicsFolder}` (match by H3 title, epic number, or frontmatter).
   - For any name **not found:** Inform the user which ones are missing and ask again for those specific ones.
   - Repeat until all provided names are validated or the user cancels.
4. **Do NOT write scope to `{outputFile}`.** Keep `target_scope`, `target_names`, and `target_epic_files` in conversation memory only — they are ephemeral session state, not persistent config.
5. Load `{stepEpics}`. After epics sync → automatically chain to `{stepStories}`.

**IMPORTANT:** Option 4 always syncs **both the epic AND its stories**. After the epic is created in Jira, the workflow proceeds to sync all stories defined within that epic. Stories are resolved with the following priority:
   1. If an individual story file exists in `{storiesFolder}/stories/` → use that file (full detail).
   2. If no individual file exists → use the story skeleton from the epic source file (has AC + basic Tasks).
   This allows the Scrum Master to have sprint visibility from day 1, even before stories are fully detailed.

---

### 4. Handle Selection — Option 5 (Specific Story/Stories)

1. Ask the user: "Which story/stories do you want to sync? Enter their names separated by commas."
2. Wait for user input (one or more names).
3. **Validate:** Search for each name in the markdown files inside `{storiesFolder}` (match by H1 title or frontmatter).
   - For any name **not found:** Inform the user which ones are missing and ask again for those specific ones.
   - Repeat until all provided names are validated or the user cancels.
4. **Do NOT write scope to `{outputFile}`.** Keep `target_scope` and `target_names` in conversation memory only.
5. Load `{stepStories}`.

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- User selection captured
- For options 4 and 5: all target names validated against source files
- Correct scope saved to `{outputFile}`
- Correct next step loaded

### ❌ SYSTEM FAILURE:

- Proceeding without waiting for user input
- Loading next step before validating specific names (options 4 and 5)

**Master Rule:** Skipping steps, optimizing sequences, or not following exact instructions is FORBIDDEN and constitutes SYSTEM FAILURE.
