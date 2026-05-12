---
name: 'step-04-fix'
description: 'Present findings and facilitate fixes or task creation'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/4-implementation/code-review'

# File References
thisStepFile: '{workflow_path}/steps/step-04-fix.md'
nextStepFile: '{workflow_path}/steps/step-05-sync-sprint.md'
workflowFile: '{workflow_path}/workflow.md'
outputFile: '{output_folder}/review-{story_key}.md'
---

# Step 4: Present and Fix Findings

## STEP GOAL:
To present the review findings to the user and either fix them automatically or convert them into action items for the story.

## MANDATORY EXECUTION RULES:
- 🛑 NEVER apply fixes without user choice
- 💾 Update Story file if Action Items created

## Sequence of Instructions

### 1. Summarize Status

Analyze the findings from the output file.
Count: High, Medium, Low issues.

Display to User:
"**Review Complete!**
Issues Found: {{High}} High, {{Medium}} Medium, {{Low}} Low."

### 2. Present FIX MENU OPTIONS

Display:
"**What should I do with these issues?**
[1] **Fix automatically** (I will update code and tests for High/Med issues)
[2] **Create Action Items** (Add checklist to Story for later)
[3] **Show Details** (Deep dive into specific issues)"

**Wait for User Selection.**

### 3. Handle Selection

1. **If [1] Fix Automatically**:
   - For all HIGH/MEDIUM issues:
     - Generate fix code.
     - Apply to files.
     - Add/Update tests.
   - Update Story Dev Record / File List.
   - Record `fixed_count`.
   - Proceed to Final Menu.

2. **If [2] Create Action Items**:
   - Create section "Review Follow-ups (AI)" in the Story file.
   - Add checkbox items: `- [ ] [AI-Review][Severity] Description`
   - Record `action_count`.
   - Proceed to Final Menu.

3. **If [3] Show Details**:
   - Display full details of issues.
   - Redisplay FIX MENU.

### 4. Determine New Status

Based on the outcome:
- If **All Critical/High/Med Fixed** AND **ACs Done**: New Status = `done`
- Else: New Status = `in-progress`

Append to `{outputFile}`:
```markdown
## Fix Outcome
- **Action Taken**: [Fixed/Tasks Created]
- **Fixed Count**: X
- **Task Count**: Y
- **Recommended Status**: {{NewStatus}}
```

### 5. Present CONTINUATION MENU

Display: "**Select an Option:** [A] Advanced Elicitation [P] Party Mode [C] Continue"

#### Menu Handling Logic:
- IF C: Save outcome to {outputFile}, update frontmatter `stepsCompleted: [1, 2, 3, 4]`, then load/execute {nextStepFile}
- IF A/P: Execute respective flows
- IF Others: Loop

#### EXECUTION RULES:
- ALWAYS halt and wait for user input
- ONLY proceed to next step when user selects 'C'
