---
name: 'step-07-implement'
description: 'Implement task following red-green-refactor cycle'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/4-implementation/dev-story'

# File References
thisStepFile: '{workflow_path}/steps/step-07-implement.md'
nextStepFile: '{workflow_path}/steps/step-08-test-authoring.md'
completionStep: '{workflow_path}/steps/step-11-mark-review.md'
---

# Step 7: Implementation Loop (Red-Green-Refactor)

## STEP GOAL:

Implement a SINGLE task or subtask using TDD and the Red-Green-Refactor cycle.

## MANDATORY RULES:

- 🛑 FOLLOW STORY TASKS EXACTLY
- 🎨 Enforce `siesa-ui-kit` usage
- 🧪 Red-Green-Refactor is MANDATORY

## EXECUTION PROTOCOLS:

### 1. Identify Next Task

1.  Read Story File.
2.  Find **FIRST** incomplete task (unchecked `[ ]`).
    *   **IF NO incomplete tasks:** Load and execute `{completionStep}` (`step-11-mark-review.md`).
    *   **IF Task Found:** Proceed below.

### 2. UI Kit Validation

For the current task:
1.  **Strictly Forbidden:** Creating custom UI components if `siesa-ui-kit` has an equivalent.
2.  **Missing Component Protocol:**
    *   If component missing, ASK user: [1] Shadcn/ui (MCP) or [2] Custom (MR to Platform).
    *   Log decision in Dev Notes.

### 3. Red Phase (Failing Test)

1.  Write a **FAILING** test for the task functionality.
2.  Run test to CONFIRM failure.

### 4. Green Phase (Make it Pass)

1.  Implement **MINIMAL** code to pass the test.
2.  Run test to CONFIRM success.
3.  Handle edge cases specified in task.

### 5. Refactor Phase

1.  Improve structure while keeping tests green.
2.  Align with architecture patterns (from Context).
3.  Document approach in **Dev Agent Record**.

### 6. Next Step

Load, read entire file, then execute `{nextStepFile}` (`step-08-test-authoring.md`).
