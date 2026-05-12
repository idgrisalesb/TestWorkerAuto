---
name: 'step-01-load-story'
description: 'Load story file and discover actual implementation changes via git'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/4-implementation/code-review'

# File References
thisStepFile: '{workflow_path}/steps/step-01-load-story.md'
nextStepFile: '{workflow_path}/steps/step-02-build-plan.md'
workflowFile: '{workflow_path}/workflow.md'
outputFile: '{output_folder}/review-{story_key}.md'

# Data References
checklist: '{workflow_path}/checklist.md'
---

# Step 1: Load Story and Discover Changes

## STEP GOAL:
To load the target story file, identify the implementation scope, and discover the actual changes in the codebase using git.

## MANDATORY EXECUTION RULES:
- 🛑 NEVER generate content without user input
- 📖 Read the complete step file before taking any action
- 📋 YOU ARE AN ADVERSARIAL CODE REVIEWER - Skeptical and thorough

## EXECUTION PROTOCOLS:
- 🎯 Load story and parse requirements
- 🔍 Detect git changes
- 💾 meaningful frontmatter updates

## Sequence of Instructions

### 1. Identify Target Story

If `{{story_path}}` is not already defined in variables:
Ask the user: "Which story file should we review? (Provide path or key)"

### 2. Load Story Content

1. Load and read the COMPLETE story file from `{{story_path}}`
2. Extract the `story_key` (e.g., from filename "1-2-user-auth.md" -> "1-2-user-auth")
3. Parse the following sections:
   - **Story Description**
   - **Acceptance Criteria**
   - **Tasks/Subtasks**
   - **Dev Agent Record** (specifically the File List)
   - **Change Log**

### 3. Discover Git Changes

1. Check if a git repository exists in the current directory (`git rev-parse --is-inside-work-tree`)
2. If yes:
   - Run `git status --porcelain` to find uncommitted changes
   - Run `git diff --name-only` to see modified files
   - Run `git diff --cached --name-only` to see staged files
   - Compile a list of **Actual Changed Files**
3. If no:
   - Note that review will rely solely on Story's File List (Warning)

### 4. Cross-Reference Claims vs Reality

Compare the Story's **Dev Agent Record -> File List** with the **Actual Changed Files**:
- Identify **Files in Git but NOT in Story** (Undocumented changes)
- Identify **Files in Story but NOT in Git** (False claims)
- Identify **Missing Documentation**

### 5. Load Project Context

Load `{project_context}` (usually `**/project-context.md`) to understand coding standards.

### 6. Initialize Output Review Document

Create `{outputFile}` with initial analysis:

```markdown
# Code Review: {{story_key}}

- **Date**: {{date}}
- **Reviewer**: {{user_name}} (AI Agent)
- **Status**: In Progress

## Initial Discovery
- **Undocumented Changes**: [List]
- **Missing Files**: [List]
```

### 7. Present MENU OPTIONS

Display: "**Select an Option:** [A] Advanced Elicitation [P] Party Mode [C] Continue"

#### Menu Handling Logic:
- IF A: Execute {advancedElicitationTask}
- IF P: Execute {partyModeWorkflow}
- IF C: Save analysis to {outputFile}, update frontmatter `stepsCompleted: [1]`, `story_path: ...`, `story_key: ...`, then only then load, read entire file, then execute {nextStepFile}
- IF Others: Handle queries then redisplay menu

#### EXECUTION RULES:
- ALWAYS halt and wait for user input
- ONLY proceed to next step when user selects 'C'
