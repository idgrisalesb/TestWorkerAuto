---
name: 'step-05-review-check'
description: 'Detect review continuation and extract review context'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/4-implementation/dev-story'

# File References
thisStepFile: '{workflow_path}/steps/step-05-review-check.md'
nextStepFile: '{workflow_path}/steps/step-06-mark-in-progress.md'
---

# Step 5: Review Context Check

## STEP GOAL:

Determine if this execution is a continuation after a code review or a fresh start.

## EXECUTION PROTOCOLS:

### 1. Check for Review Section

Inspect the story file for:
1.  Section: `Senior Developer Review (AI)`
2.  Subsection in Tasks: `Review Follow-ups (AI)`

### 2. Extract Review Context

**IF Review Section EXISTS:**
1.  Set `review_continuation = true`.
2.  Extract:
    *   Review Outcome (Approve/Changes Requested/Blocked).
    *   Review Date.
    *   Action Items (Count checked vs unchecked).
    *   Severity Breakdown.
3.  Count unchecked `[ ]` tasks in `Review Follow-ups (AI)`.
4.  Store `pending_review_items` list.
5.  Output:
    ```
    ⏯️ Resuming Story After Code Review
    Outcome: {{review_outcome}}
    Action Items: {{unchecked_review_count}} remaining
    Strategy: Prioritize review follow-ups [AI-Review] first.
    ```

**IF Review Section DOES NOT EXIST:**
1.  Set `review_continuation = false`.
2.  Set `pending_review_items = empty`.
3.  Output:
    ```
    🚀 Starting Fresh Implementation
    Story: {{story_key}}
    ```

### 3. Next Step

Load, read entire file, then execute `{nextStepFile}` (`step-06-mark-in-progress.md`).
