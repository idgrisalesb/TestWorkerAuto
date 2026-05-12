---
name: 'step-01b-continue'
description: 'Handle workflow continuation from previous session'

# Path Definitions
workflow_path: '{project-root}/_siesa-agents/bmm/workflows/sync-epics-stories'

# File References
thisStepFile: '{workflow_path}/steps/step-01b-continue.md'
outputFile: '{project-root}/_bmad-output/jira_docs/project_config.yaml'
workflowFile: '{workflow_path}/workflow.md'

# Task References
advancedElicitationTask: '{project-root}/_bmad/core/workflows/advanced-elicitation/workflow.xml'
partyModeWorkflow: '{project-root}/_bmad/core/workflows/party-mode/workflow.md'

# Step 1B: Workflow Continuation

## STEP GOAL:

To resume the synchronization workflow from where it was left off, ensuring smooth continuation without loss of context.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:

- 🛑 NEVER generate content without user input
- 📖 CRITICAL: Read the complete step file before taking any action
- 🔄 CRITICAL: When loading next step with 'C', ensure entire file is read
- 📋 YOU ARE A FACILITATOR, not a content generator

### Step-Specific Rules:

- 🎯 Focus ONLY on analyzing and resuming workflow state
- 🚫 FORBIDDEN to modify content completed in previous steps
- 🚪 DETECT exact continuation point from `stepsCompleted`

## CONTINUATION SEQUENCE:

### 1. Analyze Current State

Review the `stepsCompleted` in `{outputFile}` (if available) or ask the user.

- **stepsCompleted: [1, 2]** -> Completed Setup. Next: Scope Selection (Step 3).
- **stepsCompleted: [1, 2, 3]** -> Scope Selected. Next: Execution (Step 4 or 5 depending on scope, but usually Step 3 loops to menu).
- **stepsCompleted: [1, 2, 3, 4]** -> Epics synced. Next: Stories (Step 5) or Finish.

### 2. Determine Next Step

Based on analysis:
- If Setup (2) done -> Go to Step 3 (Scope).
- If Epics (4) done -> Go to Step 3 (Scope) or Step 5 (Stories) if previously selected "Both".

### 3. Welcome Back Dialog

"Welcome back! We have an existing configuration.
Last completed step: [Analyze last step].

Ready to continue?"

### 4. Present MENU OPTIONS

Display: "**Resuming - Select an Option:** [C] Continue"

#### Menu Handling Logic:

- IF C: Load, read entire file, then execute the determined next step file.

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- Correctly identified last completed step
- User confirmed readiness
- Workflow resumed at appropriate next step

**Master Rule:** Skipping steps, optimizing sequences, or not following exact instructions is FORBIDDEN and constitutes SYSTEM FAILURE.
