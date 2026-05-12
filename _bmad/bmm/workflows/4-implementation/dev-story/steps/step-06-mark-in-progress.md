---
name: 'step-06-mark-in-progress'
description: 'Mark story in-progress in sprint status'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/4-implementation/dev-story'

# File References
thisStepFile: '{workflow_path}/steps/step-06-mark-in-progress.md'
nextStepFile: '{workflow_path}/steps/step-07-implement.md'
sprintStatusFile: '{implementation_artifacts}/sprint-status.yaml'
---

# Step 6: Update Sprint Status

## STEP GOAL:

Update the project's sprint status tracking to reflect that work has started on this story.

## EXECUTION PROTOCOLS:

### 1. Check Sprint Status File

**IF `{sprintStatusFile}` EXISTS:**
1.  Load the FULL file.
2.  Find entry for `{{story_key}}` in `development_status`.
3.  Check current status.

### 2. Update Status

**IF Current Status == 'ready-for-dev' OR `review_continuation == true`:**
1.  Update status to `in-progress`.
2.  Save file.
3.  Output:
    ```
    🚀 Status updated: ready-for-dev → in-progress
    ```

**IF Current Status == 'in-progress':**
1.  Output: `⏯️ Story already in-progress.`

**IF Status Unknown/Other:**
1.  Output: `⚠️ Unexpected status: {{current_status}}. Continuing...`

### 3. Non-Sprint Tracking

**IF `{sprintStatusFile}` DOES NOT EXIST:**
1.  Output: `ℹ️ No sprint status file. Progress tracked in story file only.`

### 4. Next Step

Load, read entire file, then execute `{nextStepFile}` (`step-07-implement.md`).
