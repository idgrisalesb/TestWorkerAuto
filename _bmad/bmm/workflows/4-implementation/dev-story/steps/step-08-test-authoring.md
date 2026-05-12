---
name: 'step-08-test-authoring'
description: 'Author comprehensive tests'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/4-implementation/dev-story'

# File References
thisStepFile: '{workflow_path}/steps/step-08-test-authoring.md'
nextStepFile: '{workflow_path}/steps/step-09-run-tests.md'
---

# Step 8: Comprehensive Test Authoring

## STEP GOAL:

Ensure the implemented task is covered by robust tests beyond the initial TDD cycle (Integration, E2E, Edge Cases).

## EXECUTION PROTOCOLS:

### 1. Unit Tests

Ensure business logic and core functionality are covered.

### 2. Integration Tests

Add tests for component interactions if specified in story requirements.

### 3. End-to-End (E2E) Tests

Include E2E tests for critical UI flows if story demands them.

### 4. Edge Cases

Cover error handling and edge cases identified in Dev Notes.

### 5. Next Step

Load, read entire file, then execute `{nextStepFile}` (`step-09-run-tests.md`).
