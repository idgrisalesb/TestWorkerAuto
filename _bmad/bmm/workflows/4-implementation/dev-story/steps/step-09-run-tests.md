---
name: 'step-09-run-tests'
description: 'Run validations and tests'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/4-implementation/dev-story'

# File References
thisStepFile: '{workflow_path}/steps/step-09-run-tests.md'
nextStepFile: '{workflow_path}/steps/step-10-validate-task.md'
---

# Step 9: Run Tests & Validations

## STEP GOAL:

Verify implementation correctness, ensure no regressions, and validate coding standards.

## EXECUTION PROTOCOLS:

### 1. Run Tests

1.  Infer test framework (Vitest/Jest).
2.  **Run All Tests**: Ensure no regressions.
3.  **Run New Tests**: Verify implementation.

### 2. Run Quality Checks

1.  Run Linting/Static Analysis (if configured).

### 3. Validate Standards

1.  **UI Library Check**: Verify NO custom styles/components were created where `siesa-ui-kit` exists (unless logged).

### 4. Handling Failures

*   **Regression Failures**: STOP and Fix.
*   **New Test Failures**: STOP and Fix.
*   **UI Violation**: STOP and Refactor.

### 5. Next Step

Load, read entire file, then execute `{nextStepFile}` (`step-10-validate-task.md`).
