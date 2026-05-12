---
name: 'step-05-sync-sprint'
description: 'Update story status content and synchronize sprint tracking file'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/4-implementation/code-review'

# File References
thisStepFile: '{workflow_path}/steps/step-05-sync-sprint.md'
nextStepFile: '{workflow_path}/steps/step-06-jira-sync.md'
workflowFile: '{workflow_path}/workflow.md'
outputFile: '{output_folder}/review-{story_key}.md'

# Data References
sprint_status_file: '{implementation_artifacts}/sprint-status.yaml'
---

# Step 5: Update Status and Sync Sprint

## STEP GOAL:
To officially update the story file's status field and synchronize the project's sprint-status.yaml file to reflect the review outcome.

## MANDATORY EXECUTION RULES:
- 💾 Persist all status changes
- 🔄 Ensure consistency between Story and Sprint Status

## Sequence of Instructions

### 1. Update Story File

Using the `New Status` determined in Step 4 (`done` or `in-progress`):
1. **Load** the Story File.
2. **Find** the `Status:` field in the metadata/header.
3. **Update** it to the new status.
4. **Save** the Story File.

### 2. Update Sprint Status YAML

Check if `{sprint_status_file}` exists.
- **If NO**:
  - Log "No sprint-status.yaml found. Skipping sync."

- **If YES**:
  1. **Load** `{sprint_status_file}`.
  2. **Find** the key `development_status` matching `{{story_key}}`.
  3. **Update** the value to the new status (`done` or `in-progress`).
  4. **Save** the file, preserving comments and structure.
  5. **Log**: "✅ Sprint status synced: {{story_key}} -> {{status}}".

### 3. Log Result

Append to `{outputFile}`:
```markdown
## Status Sync
- **Story File Status**: Updated to {{status}}
- **Sprint Status YAML**: [Synced/Skipped]
```

### 4. Present MENU OPTIONS

Display: "**Select an Option:** [A] Advanced Elicitation [P] Party Mode [C] Continue to Jira Sync"

#### Menu Handling Logic:
- IF C: Save result to {outputFile}, update frontmatter `stepsCompleted: [1, 2, 3, 4, 5]`, then load/execute {nextStepFile}
- IF A/P: Execute respective flows
- IF Others: Loop

#### EXECUTION RULES:
- ALWAYS halt and wait for user input
- ONLY proceed to next step when user selects 'C'
