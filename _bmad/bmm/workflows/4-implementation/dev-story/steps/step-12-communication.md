---
name: 'step-12-communication'
description: 'Completion communication and user support'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/4-implementation/dev-story'

# File References
thisStepFile: '{workflow_path}/steps/step-12-communication.md'
---

# Step 12: Communication & Handover

## STEP GOAL:

Inform the user of completion, provide a summary, and suggest next steps.

## EXECUTION PROTOCOLS:

### 1. Prepare Summary

1.  Compile key accomplishments: Story ID/Title, Files Modified, Tests Added.
2.  Summarize from **Completion Notes**.

### 2. User Communication

1.  Output:
    ```
    🎉 **Story Implementation Complete**
    Story: {{story_key}}
    Status: review
    Files: {{files_modified_count}}
    Tests: {{tests_added_summary}}
    ```
2.  Provide Story File Path.

### 3. Explanation & Handover

1.  Ask if user needs explanations (Technical decisions, How to test, etc.).
2.  **IF User Asks**: Provide clear context tailored to skill level.
3.  **Next Steps**: Suggest running `code-review` workflow.

### 4. Completion

**TERMINATE WORKFLOW.**
