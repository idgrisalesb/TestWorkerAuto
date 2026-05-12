---
name: dev-story
description: 'Execute a story by implementing tasks/subtasks, writing tests, validating, and updating the story file per acceptance criteria'
web_bundle: true
---

# Dev Story Workflow

**Goal:** Execute a story by implementing tasks/subtasks, writing tests, validating, and updating the story file per acceptance criteria.

## WORKFLOW ARCHITECTURE

This uses **step-file architecture** for disciplined execution:

### Core Principles

- **Micro-file Design**: Each step is a self contained instruction file
- **Just-In-Time Loading**: Only the current step file is in memory
- **Sequential Enforcement**: Sequence within the step files must be completed in order
- **State Tracking**: Document progress in output file frontmatter
- **Append-Only Building**: Build documents by appending content

### Step Processing Rules

1. **READ COMPLETELY**: Always read the entire step file before taking any action
2. **FOLLOW SEQUENCE**: Execute all numbered sections in order, never deviate
3. **WAIT FOR INPUT**: If a menu is presented, halt and wait for user selection
4. **CHECK CONTINUATION**: If the step has a menu with Continue as an option, only proceed when user selects 'C'
5. **SAVE STATE**: Update `stepsCompleted` in frontmatter before loading next step

---

## INITIALIZATION SEQUENCE

### 1. Configuration Loading

Load and read full config from `{project-root}/_bmad/bmm/config.yaml` and resolve:

- `project_name`, `output_folder`, `user_name`, `communication_language`, `document_output_language`
- `implementation_artifacts`, `user_skill_level`

### 2. First Step EXECUTION

Load, read the full file and then execute `{workflow_path}/steps/step-01-find-story.md` to begin the workflow.
