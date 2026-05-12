# MANDATORY RULE: FEATURE-SPECIFIC CONTEXT INJECTION FOR DEVELOPMENT (SHARED ARTIFACTS)

**CRITICAL INSTRUCTION:** YOU MUST ACTIVELY LOOK FOR AND READ THESE FILES RIGHT NOW USING YOUR TOOLS (Read/Glob/Bash) BEFORE STARTING THE IMPLEMENTATION. DO NOT PROCEED TO WRITE CODE UNTIL YOU HAVE EXECUTED THESE SPECIFIC STEPS.

**PATH VARIABLES PATTERN:**
- `{project_root}` = the root directory of the current project.
- `{planning_artifacts}` = standard path for planning files (e.g. `_bmad-output/planning-artifacts`).
- `{shared_artifacts}` = standard path for shared configurations (`_bmad-output/shared-artifacts`).
- `{sprint_status}` = standard path for sprint status file (`_bmad-output/implementation-artifacts/sprint-status.yaml`).

---

## EXECUTION STEPS (PERFORM THESE ACTIONS NOW)

**STEP 1: IDENTIFY THE FEATURE SOURCE**
1. Read the user story you are assigned to implement. Identify its parent epic.
2. **USE YOUR READ TOOL** to open and read `{sprint_status}` if you need to trace the epic number to its source feature name.
3. Determine the feature name/epic source (e.g., `epic-02-auth-module.md`).

**STEP 2: VALIDATE SHARED ARTIFACTS DIRECTORY**
1. **USE YOUR GLOB OR BASH TOOL** to check if the directory `{shared_artifacts}/` exists and what folders are inside it.
2. Look for a folder that matches the feature name extracted in Step 1 (e.g., `_bmad-output/shared-artifacts/epic-02-auth-module` or `_bmad-output/shared-artifacts/auth-module`).

**STEP 3: INJECT CONTEXT FROM FILES**
1. If the specific feature folder exists, **USE YOUR READ TOOL** to read ALL markdown files inside it, especially `technical-preference.md`, `architecture.md` or any other domain rule file.
2. If the folder does not exist, acknowledge it and proceed normally.

**STEP 4: APPLY TO THE IMPLEMENTATION**
- You MUST enforce any system rules, design patterns, testing requirements, or UI guidelines found in the `technical-preference.md` or related files during your code implementation.
- Ensure your code structure, libraries used, and architectural decisions align with these shared artifacts.
- DO NOT start coding without integrating these rules if they exist for the feature.

# MANDATORY RULE: DEV STORY WORKFLOW

**TRIGGER:** Every time the user requests to run a DEV STORY, such as `/dev-story`.

**CONTEXT TO INJECT (apply throughout the entire workflow):**

The following rules must be kept in memory and applied at the right moment without altering the standard workflow flow:

## 1. During step-02-check-branch: use the following definition for point 3. Gather Branch Parameters

### 3. Gather Branch Parameters

<action>
Per the naming format in `{gitFlowGuide}` (`rama-padre-team-owner-rq-descripcion`), gather:

1. **Parent Branch**: `develop` (fixed per guidelines)
2. **Team**: Ask user or derive from project context
3. **Owner**: Ask user or derive from git config (`git config user.email`)
4. **RQ**: Extract from story metadata or ask user for requirement number
5. **Description**: Derive from epic or feature name, sanitized (lowercase, hyphens)
</action>

<output>
To create the branch, I need the following information per GitFlow guidelines:
- **Team prefix**: (e.g., `legacy-erp-nomina`, `platform`, etc.)
- **RQ number**: (requirement/ticket number)

The owner will be derived from your git config, and the description from the story.
</output>

## 2. During step-02-check-branch: use the following definition for point 4. Construct Branch Name

### 4. Construct Branch Name

<action>
1. Build branch name following the pattern from `{gitFlowGuide}`:
   `{parent}-{team}-{owner}-{rq}-{description}`

2. Apply governance rules from Section 4:
   - All lowercase
   - No special characters
   - Hyphens as separators
   - Branches must be created by epic or feature:
     1. Extract the parent epic of the current story (from story frontmatter or `{sprint_status}`)
     2. Use the **epic name/slug** as `{description}`, NOT the story name
     3. Before creating a new branch, run `git branch --list "*rq{N}*"` to check if an epic-level branch already exists for this epic
     4. **IF an epic branch already exists** → reuse it (switch/worktree to it), do NOT create a new one
     5. **IF not** → create it using the epic slug as `{description}`

Example: `develop-legacy-erp-nomina-gaduranb-rq1234-nueva-interfaz`
         (where `nueva-interfaz` is the **epic** slug, not a story slug)
</action>

## 3. During step-02-check-branch: use the following definition for point 5. Check and Create/Switch Branch

### 5. Check and Create/Switch Branch

**IF Current Branch == Target Branch:**
- Output: `✅ Already on correct branch: {{target_branch}}`
- Proceed to Next Step.

**IF Current Branch != Target Branch:**
1. Check if `target_branch` exists: `git branch --list {{target_branch}}`.
2. **IF Exists:**
   - Run `cd ../wt-{{folder_name}}/{{folder_name}}-{{target_branch}}`.
   - Output: `🔄 Switched to existing branch: {{target_branch}}`.
3. **IF Not Exists:**
   - Run `git worktree add ../wt-{{folder_name}}/{{folder_name}}-{{target_branch}} -b {{target_branch}}`.
   - Run `cd ../wt-{{folder_name}}/{{folder_name}}-{{target_branch}}`.
   - Output: `✨ Created and switched to new branch: {{target_branch}}`.

## 4. Sub-agents: only when invoked via quick-dev

Sub-agents **must NOT be used** when the code review workflow is invoked directly (e.g., `/dev-story`). Sub-agents are only permitted when the workflow is triggered as part of **quick-dev** (e.g., `/quick-dev`).

- If invoked directly → follow the standard sequential workflow steps without spawning any sub-agents.
- If invoked from quick-dev → sub-agents may be used as defined by the quick-dev orchestration.

# MANDATORY RULE: OBSERVABILITY EVENTS

**TRIGGER:** Every time the dev-story workflow is executed.

**PURPOSE:** Emit lifecycle events to measure workflow duration per story. Events are sent to Loki for observability dashboards.

**SCRIPT PATH:** `{project_root}/_siesa-agents/observability/scripts/sa-emit.js`

## 5. After step-01 identifies the story (before presenting the menu)

Once `{{story_key}}` has been determined in step-01-find-story, and BEFORE presenting the menu or proceeding to step-02, execute via Bash:

```bash
node "{project_root}/_siesa-agents/observability/scripts/sa-emit.js" --event workflow.started --story "{{story_key}}" --phase dev-story
```

## 6. In step-11, after marking the story as review in sprint-status.yaml

After step-11-mark-review updates `sprint-status.yaml` (`in-progress → review`), and BEFORE proceeding to step-12, execute these two commands in sequence via Bash:

```bash
node "{project_root}/_siesa-agents/observability/scripts/sa-emit.js" --event status.changed --story "{{story_key}}" --phase dev-story --from in-progress --to review
```

```bash
node "{project_root}/_siesa-agents/observability/scripts/sa-emit.js" --event workflow.finished --story "{{story_key}}" --phase dev-story
```

## Observability execution rules

- If any `sa-emit` call fails, log the error and **continue the workflow normally**. Observability must never block the workflow.
- Use the exact `{{story_key}}` value as resolved in step-01 (e.g., `1-1-user-authentication`).
- Do NOT wait for user confirmation to execute these commands — they are silent background operations.