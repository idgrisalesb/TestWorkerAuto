---
name: 'step-11-mark-review'
description: 'Story completion and mark for review'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/4-implementation/dev-story'

# File References
thisStepFile: '{workflow_path}/steps/step-11-mark-review.md'
nextStepFile: '{workflow_path}/steps/step-12-communication.md'
sprintStatusFile: '{implementation_artifacts}/sprint-status.yaml'
---

# Step 11: Final Validation & Status Update

## STEP GOAL:

Perform final Definition of Done (DoD) validation and update story status to "review".

## EXECUTION PROTOCOLS:

### 1. Final Validation Gates

1.  **Re-scan Story**: Verify ALL tasks `[x]`.
2.  **Full Regression**: Run suite.
3.  **File List**: Ensure complete.
4.  **UI Compliance**: Verify `siesa-ui-kit`.
5.  **DoD Checklist**:
    *   ACs met.
    *   Tests (Unit/Int/E2E) pass.
    *   Quality checks pass.
    *   Dev Notes updated.

**IF Validation Fails:** HALT and Fix.

### 2. Update Story Status

1.  Update Story Status section to: `review`.

### 3. Update Sprint Status

**IF `{sprintStatusFile}` EXISTS:**
1.  Load FULL file.
2.  Update `development_status[{{story_key}}] = "review"`.
3.  Save file (preserving comments).
4.  Output: `✅ Story status updated to "review" in sprint-status.yaml`.

### 4. Next Step

Load, read entire file, then execute `{nextStepFile}` (`step-12-communication.md`).
