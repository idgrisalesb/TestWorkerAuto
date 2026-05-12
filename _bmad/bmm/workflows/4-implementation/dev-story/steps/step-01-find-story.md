---
name: 'step-01-find-story'
description: 'Find next ready story and load it'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/4-implementation/dev-story'

# File References
thisStepFile: '{workflow_path}/steps/step-01-find-story.md'
nextStepFile: '{workflow_path}/steps/step-02-check-branch.md'
configSource: '{project-root}/_bmad/bmm/config.yaml'

# Context References
sprintStatusFile: '{implementation_artifacts}/sprint-status.yaml'
---

# Step 1: Find Next Ready Story

## STEP GOAL:

To identify, locate, and load the correct story file for development, either from the sprint status or by direct search.

## MANDATORY EXECUTION RULES:

- 🛑 NEVER proceed without a valid story file
- 📖 Read the entire step file first
- 💾 Store `story_path` and `story_key` in memory for subsequent steps

## EXECUTION PROTOCOLS:

### 1. Check for Provided Story Path

If `story_path` variable is already provided (e.g., passed by user):

1.  Use `story_path` directly.
2.  Read the COMPLETE story file.
3.  Extract `story_key` from filename or metadata.
4.  Proceed to **Completion**.

### 2. Sprint-Based Discovery (Priority)

Check if `{sprintStatusFile}` exists.

**IF EXISTS:**

1.  Load the FULL file `{sprintStatusFile}`.
2.  Read all lines to understand story order.
3.  Find the **FIRST** story where:
    *   Key matches pattern: `number-number-name` (e.g., `1-2-user-auth`).
    *   NOT an epic key (`epic-X`) or retrospective.
    *   Status value equals `ready-for-dev`.

**IF NO ready-for-dev story found:**

1.  Display:
    ```
    📋 No ready-for-dev stories found in sprint-status.yaml
    Current Sprint Status: [Summary]
    ```
2.  Ask user to choose:
    *   [1] Run `create-story` (HALT and suggest command).
    *   [2] Run `validate-create-story` (HALT and suggest command).
    *   [3] Specify story file path manually.
    *   [4] Review detailed sprint status.
3.  **HALT** and wait for input.

**IF ready-for-dev story found:**

1.  Store `story_key` (e.g., "1-2-user-auth").
2.  Find matching story file in `{story_dir}` (from config) using pattern `{{story_key}}.md`.
3.  Read COMPLETE story file.
4.  Proceed to **Completion**.

### 3. Non-Sprint Discovery (Fallback)

If `{sprintStatusFile}` does **NOT** exist:

1.  Search `{story_dir}` for markdown files `*-*-*.md`.
2.  Read files to find one with Status: `ready-for-dev`.
3.  If none found, Ask user to specify path or run creation tools.
4.  If found, use that file, extract `story_key`, and read content.

### 4. Story Context Extraction

Once story file is loaded (from any method above):

1.  Parse sections: Story, Acceptance Criteria, Tasks/Subtasks, Dev Notes, Dev Agent Record, File List, Change Log, Status.
2.  Load comprehensive context from Dev Notes (architecture, learnings, specs).
3.  Identify first incomplete task (unchecked `[ ]`).
    *   If no incomplete tasks: Inform user story seems complete.
    *   If incomplete task found: Proceed.

### 5. Completion and Next Step

Once story is identified and loaded:

1.  Display:
    ```
    ✅ Story Selected: {{story_key}}
    Task: {{first_incomplete_task}}
    ```
2.  Load, read entire file, then execute `{nextStepFile}` (`step-02-check-branch.md`).

---

## CRITICAL:

- Do NOT load next step if story is not found or file is unreadable.
- If user input is required to pick a story, wait for it.
