# MANDATORY RULE: FEATURE-SPECIFIC CONTEXT INJECTION (SHARED ARTIFACTS)

**CRITICAL INSTRUCTION:** YOU MUST ACTIVELY LOOK FOR AND READ THESE FILES RIGHT NOW USING YOUR TOOLS (Read/Glob/Bash) BEFORE CONTINUING WITH THE WORKFLOW. DO NOT PROCEED TO CREATE THE STORY UNTIL YOU HAVE EXECUTED THESE SPECIFIC STEPS.

**PATH VARIABLES PATTERN:**
- `{project_root}` = the root directory of the current project.
- `{planning_artifacts}` = standard path for planning files (e.g. `_bmad-output/planning-artifacts`).
- `{shared_artifacts}` = standard path for shared configurations (`_bmad-output/shared-artifacts`).
- `{sprint_status}` = standard path for sprint status file (`_bmad-output/implementation-artifacts/sprint-status.yaml`).

---

## EXECUTION STEPS (PERFORM THESE ACTIONS NOW)

**STEP 1: IDENTIFY THE FEATURE SOURCE**
1. Determine the story you are going to create. Identify its parent epic number (e.g., if creating story `5-1-something`, the epic is `epic-5`).
2. **USE YOUR READ TOOL** to open and read `{sprint_status}`.
3. Locate the key `epic-{N}-source` for your target epic to discover the physical file name of the feature (e.g., `epic-02-auth-module.md`).

**STEP 2: VALIDATE SHARED ARTIFACTS DIRECTORY**
1. **USE YOUR GLOB OR BASH TOOL** to check if the directory `{shared_artifacts}/` exists and what folders are inside it.
2. Look for a folder that matches the feature name extracted in Step 1 (e.g., `_bmad-output/shared-artifacts/epic-02-auth-module` or `_bmad-output/shared-artifacts/auth-module`).

**STEP 3: INJECT CONTEXT FROM FILES**
1. If the specific feature folder exists, **USE YOUR READ TOOL** to read ALL markdown files inside it, especially `technical-preference.md` or any architectural/domain rule file.
2. If the folder does not exist, acknowledge it and proceed normally.
3. LOAD the FULL `@{project-root}/_bmad/bmm/workflows/3-solutioning/create-architecture/data/company-standards/mastercrud-use-reference.md` — MasterCrud is the highest-level orchestrator component in Siesa UI Kit. It coordinates data grids, forms, filters, and CRUD operations into a unified, configurable interface. **You MUST apply its API contract and configuration patterns whenever the story involves a CRUD screen,   data grid, or form-based UI.** 

**STEP 4: APPLY TO THE STORY**
- You MUST enforce any system rules, design patterns, testing requirements, or UI guidelines found in the `technical-preference.md` file into the Acceptance Criteria and Technical Details of the user story you are writing. DO NOT write the story without integrating these rules if they exist.

# MANDATORY RULE: CREATE STORY WORKFLOW

**TRIGGER:** Every time the user requests a CREATE STORY, such as `/create-story`.

**CONTEXT TO INJECT (apply throughout the entire workflow):**

The following rules must be kept in memory and applied at the appropriate moment without altering the standard workflow flow:

## 1. Sub-agents: only when invoked via quick-dev

Sub-agents **must NOT be used** when the code review workflow is invoked directly (e.g., `/create-story`). Sub-agents are only permitted when the workflow is triggered as part of **quick-dev** (e.g., `/quick-dev`).

- If invoked directly → follow the standard sequential workflow steps without spawning any sub-agents.
- If invoked from quick-dev → sub-agents may be used as defined by the quick-dev orchestration.

# MANDATORY RULE: OBSERVABILITY EVENTS

**TRIGGER:** Every time the create-story workflow is executed.

**PURPOSE:** Emit lifecycle events to measure workflow duration per story. Events are sent to Loki for observability dashboards.

**SCRIPT PATH:** `{project_root}/_siesa-agents/observability/scripts/sa-emit.js`

## 2. After step-01 identifies the story (before presenting the menu)

Once `{{story_key}}` has been determined (sections 1-3 of step-01), and BEFORE presenting the menu options (section 4), execute via Bash:

```bash
node "{project_root}/_siesa-agents/observability/scripts/sa-emit.js" --event workflow.started --story "{{story_key}}" --phase create-story
```

## 3. In step-06, after updating sprint-status.yaml (before the Final Report)

After the sprint-status.yaml update (section 1) completes and BEFORE the Final Report (section 3), execute these two commands in sequence via Bash:

```bash
node "{project_root}/_siesa-agents/observability/scripts/sa-emit.js" --event status.changed --story "{{story_key}}" --phase create-story --from backlog --to ready-for-dev
```

```bash
node "{project_root}/_siesa-agents/observability/scripts/sa-emit.js" --event workflow.finished --story "{{story_key}}" --phase create-story
```

## Observability execution rules

- If any `sa-emit` call fails, log the error and **continue the workflow normally**. Observability must never block the workflow.
- Use the exact `{{story_key}}` value as resolved in step-01 (e.g., `1-1-user-authentication`).
- Do NOT wait for user confirmation to execute these commands — they are silent background operations.