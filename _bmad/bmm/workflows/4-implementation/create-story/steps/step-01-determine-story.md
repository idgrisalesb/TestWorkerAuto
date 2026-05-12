---
name: 'step-01-determine-story'
description: 'Determine which story to work on next'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/4-implementation/create-story'

# File References
thisStepFile: '{workflow_path}/steps/step-01-determine-story.md'
nextStepFile: '{workflow_path}/steps/step-02-analyze.md'
workflowFile: '{workflow_path}/workflow.md'

# Variables
sprint_status: '{implementation_artifacts}/sprint-status.yaml || {output_folder}/sprint-status.yaml'

# Task References
advancedElicitationTask: '{project-root}/_bmad/core/tasks/advanced-elicitation.xml'
partyModeWorkflow: '{project-root}/_bmad/core/workflows/party-mode/workflow.md'
---

# Step 1: Determine Target Story

## STEP GOAL:
To identify exactly which user story needs to be created, either from user input or by auto-discovering the next backlog item from the sprint status.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:
- 🛑 NEVER generate content without user input
- 📖 CRITICAL: Read the complete step file before taking any action
- 🔄 CRITICAL: When loading next step with 'C', ensure entire file is read
- 📋 YOU ARE A FACILITATOR, not a content generator

### Step-Specific Rules:
- 🎯 Focus only on identifying the story ID (e.g., "1-2") and Title
- 🚫 FORBIDDEN to analyze deep context yet
- 💬 Ask strictly for story ID if not found automatically

## EXECUTION PROTOCOLS:

- 🎯 Identify story to create
- 💾 Set {{story_id}}, {{epic_num}}, {{story_num}}, {{story_key}} memory variables
- 📖 No file output in this step, only memory state

## INSTRUCTIONS:

### 1. Check User Input
Check if the user provided a story path or ID (e.g., "1-2-user-auth").
- IF YES: Parse it, set {{story_id}} variables, and [GO TO Section 4]
- IF NO: Proceed to Section 2

### 2. Auto-Discovery
Check if `{sprint_status}` file exists.
- IF NO: Display options to user:
  1. Run `sprint-planning` (Recommended)
  2. Enter specific epic-story number
  3. Quit
  [Wait for selection]

- IF YES: Load and read `{sprint_status}`.
  - Parse `development_status` section.
  - Find FIRST story where status is "backlog".
  - IF NONE FOUND: Display "No backlog stories found" and HALT.
  - IF FOUND: Extract `epic_num`, `story_num`, `story_title`.
  - Set variables.

### 3. Verify Epic Status
Check the status of the Epic {{epic_num}} in `sprint_status`.
- If "done": HALT. Cannot add to done epic.
- If "backlog": Update to "in-progress" in `sprint_status` (save file).
- If "in-progress": Continue.

### 4. Present MENU OPTIONS

Display: "**Target Story Identified: {{story_id}} - {{story_title}}**"
Display: "**Select an Option:** [A] Advanced Elicitation [P] Party Mode [C] Continue to Analysis"

#### Menu Handling Logic:
- IF A: Execute {advancedElicitationTask}
- IF P: Execute {partyModeWorkflow}
- IF C: Load, read entire file, then execute {nextStepFile}

#### EXECUTION RULES:
- ALWAYS halt and wait for user input after presenting menu
- ONLY proceed to next step when user selects 'C'
