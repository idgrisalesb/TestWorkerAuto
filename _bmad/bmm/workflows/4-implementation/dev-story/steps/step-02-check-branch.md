---
name: 'step-02-check-branch'
description: 'Validate and enforce Git branch naming convention per centralized GitFlow guidelines'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/4-implementation/dev-story'

# File References
thisStepFile: '{workflow_path}/steps/step-02-check-branch.md'
nextStepFile: '{workflow_path}/steps/step-03-load-context.md'

# Centralized GitFlow Guidelines
gitFlowGuide: '{project-root}/_bmad/bmm/data/git-flow-siesa.md'
---

# Step 2: Git Branch Validation

## STEP GOAL:

Ensure development occurs on the correct feature branch following the **centralized GitFlow guidelines** defined in `{gitFlowGuide}`.

## MANDATORY EXECUTION RULES:

- 📖 **LOAD AND READ** `{gitFlowGuide}` before any Git operation
- 🛑 NEVER start development on `main` or `develop` directly
- 🔄 Follow the branch naming convention from the centralized guide

## EXECUTION PROTOCOLS:

### 1. Load GitFlow Guidelines

<action>
1. Load and read the entire file at `{gitFlowGuide}`.
2. Extract and store the following rules:
   - **Parent Branch**: The required source branch for features (Section 1)
   - **Branch Naming Format**: The naming convention pattern (Section 2)
   - **Commit Standards**: The message format requirements (Section 3)
   - **Governance Rules**: Protection and naming constraints (Section 4)
</action>

### 2. Validate Parent Branch

<action>
1. Run `git branch --show-current` to get `current_branch`.
2. Per the GitFlow guide, validate that you are on or can branch from `develop`.
3. If not on `develop`:
   - Run `git checkout develop && git pull origin develop`
   - Confirm no pending changes before branching
</action>

### 3. Gather Branch Parameters

<action>
Per the naming format in `{gitFlowGuide}` (`rama-padre-team-owner-rq-descripcion`), gather:

1. **Parent Branch**: `develop` (fixed per guidelines)
2. **Team**: Ask user or derive from project context
3. **Owner**: Ask user or derive from git config (`git config user.email`)
4. **RQ**: Extract from story metadata or ask user for requirement number
5. **Description**: Derive from story name, sanitized (lowercase, hyphens)
</action>

<output>
To create the branch, I need the following information per GitFlow guidelines:
- **Team prefix**: (e.g., `legacy-erp-nomina`, `platform`, etc.)
- **RQ number**: (requirement/ticket number)

The owner will be derived from your git config, and the description from the story.
</output>

### 4. Construct Branch Name

<action>
1. Build branch name following the pattern from `{gitFlowGuide}`:
   `{parent}-{team}-{owner}-{rq}-{description}`

2. Apply governance rules from Section 4:
   - All lowercase
   - No special characters
   - Hyphens as separators

Example: `develop-legacy-erp-nomina-gaduranb-rq1234-nueva-interfaz`
</action>

### 5. Check and Create/Switch Branch

**IF Current Branch == Target Branch:**
- Output: `✅ Already on correct branch: {{target_branch}}`
- Proceed to Next Step.

**IF Current Branch != Target Branch:**
1. Check if `target_branch` exists: `git branch --list {{target_branch}}`.
2. **IF Exists:**
   - Run `git checkout {{target_branch}}`.
   - Output: `🔄 Switched to existing branch: {{target_branch}}`.
3. **IF Not Exists:**
   - Run `git checkout -b {{target_branch}}`.
   - Output: `✨ Created and switched to new branch: {{target_branch}}`.

### 6. Store Branch Context

<action>
Store `target_branch` in workflow context for use in subsequent steps (commit, push).
</action>

### 7. Next Step

Load, read entire file, then execute `{nextStepFile}` (`step-03-load-context.md`).
