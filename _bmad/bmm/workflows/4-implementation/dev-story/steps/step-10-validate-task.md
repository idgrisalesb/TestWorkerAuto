---
name: 'step-10-validate-task'
description: 'Validate and mark task complete'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/4-implementation/dev-story'

# File References
thisStepFile: '{workflow_path}/steps/step-10-validate-task.md'
nextTaskStep: '{workflow_path}/steps/step-07-implement.md'
completionStep: '{workflow_path}/steps/step-11-mark-review.md'
---

# Step 10: Task Completion & Loop

## STEP GOAL:

Formally mark the task as complete after verifying all gates, update records, and determine if the workflow should loop for the next task or finish.

## MANDATORY EXECUTION RULES:

- 🛑 NEVER mark complete unless ALL validation gates pass.
- 🔄 Loop back to Step 07 if tasks remain.

## EXECUTION PROTOCOLS:

### 1. Validation Gates

Confirm:
1.  Tests EXIST and PASS.
2.  Implementation matches Task specs exactly.
3.  ACs satisfied.
4.  `siesa-ui-kit` compliance.
5.  No regressions.

### 2. Review Follow-up Handling

**IF Task is `[AI-Review]` follow-up:**
1.  Add to `resolved_review_items`.
2.  Mark task `[x]`.
3.  Mark corresponding Action Item `[x]` in Review Section.
4.  Log resolution in Completion Notes.

### 3. Mark Complete

**IF All Gates Pass:**
1.  Mark task/subtask `[x]`.
2.  Update **File List** (new/modified/deleted files).
3.  Add **Completion Notes**.

**IF Validation Fails:**
1.  **HALT**. Do not proceed. Fix issues.

### 4. Loop Decision

1.  Save Story File.
2.  Check for **Incomplete Tasks**.

**IF Tasks Remain:**
1.  Load, read entire file, then execute `{nextTaskStep}` (`step-07-implement.md`).

**IF NO Tasks Remain:**
1.  Load, read entire file, then execute `{completionStep}` (`step-11-mark-review.md`).
