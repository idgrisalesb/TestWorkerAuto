---
name: 'step-02-build-plan'
description: 'Build a rigorous review attack plan based on requirements'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/4-implementation/code-review'

# File References
thisStepFile: '{workflow_path}/steps/step-02-build-plan.md'
nextStepFile: '{workflow_path}/steps/step-03-review.md'
workflowFile: '{workflow_path}/workflow.md'
outputFile: '{output_folder}/review-{story_key}.md'
---

# Step 2: Build Review Attack Plan

## STEP GOAL:
To create a structured "attack plan" for the review, identifying exactly what needs to be verified based on the story's Acceptance Criteria and Tasks.

## MANDATORY EXECUTION RULES:
- 📋 YOU ARE AN ADVERSARIAL REVIEWER
- 🎯 Don't trust; verify.
- 📖 Read entire file before executing

## Sequence of Instructions

### 1. Extract Requirements

From the loaded story file:
1. Extract **ALL Acceptance Criteria (ACs)**
2. Extract **ALL Tasks and Subtasks** that are marked as completed `[x]`
3. Extract the **claimed implementation files**

### 2. Identify Context Documents

Based on the `input_file_patterns` strategy:
1. Detect referenced Epic files (Selective Load)
2. Detect Architecture documents (Full Load)
3. Detect UX Design documents (if applicable)

*Note: Do not read them yet, just identify which ones are relevant for the review.*

### 3. Construct Review Matrix

Create a plan to verify each item:

1. **AC Validation Plan**:
   - For each AC, define what defines "success".
   - Identify which files likely contain the logic.

2. **Task Audit Plan**:
   - For each completed Task, define verifying evidence.
   - Flag any tasks that seem subjective.

3. **Code Quality Criteria**:
   - Security (Injection, Auth, Input Validation)
   - Performance (Loops, Queries, Caching)
   - Maintainability (Naming, Structure, Comments)
   - Tests (Real assertions vs placeholders, Coverage)

### 4. Document Plan

Append to `{outputFile}`:

```markdown
## Review Plan

### Items to Verify
- [ ] AC1: ...
- [ ] AC2: ...
- [ ] Task: ...

### Focus Areas
- Security checks on: [List files]
- Performance checks on: [List files]
```

### 5. Present MENU OPTIONS

Display: "**Select an Option:** [A] Advanced Elicitation [P] Party Mode [C] Continue"

#### Menu Handling Logic:
- IF C: Save plan to {outputFile}, update frontmatter `stepsCompleted: [1, 2]`, then load/execute {nextStepFile}
- IF A/P: Execute respective flows
- IF Others: Handle queries then loop

#### EXECUTION RULES:
- ALWAYS halt and wait for user input
- ONLY proceed to next step when user selects 'C'
