---
name: 'step-02-analyze'
description: 'Load and analyze core artifacts'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/4-implementation/create-story'

# File References
thisStepFile: '{workflow_path}/steps/step-02-analyze.md'
nextStepFile: '{workflow_path}/steps/step-03-architecture.md'
workflowFile: '{workflow_path}/workflow.md'

# Variables
output_folder: '{implementation_artifacts}'

# Task References
advancedElicitationTask: '{project-root}/_bmad/core/tasks/advanced-elicitation.xml'
partyModeWorkflow: '{project-root}/_bmad/core/workflows/party-mode/workflow.md'
---

# Step 2: Load and Analyze Core Artifacts

## STEP GOAL:
To gather all necessary context from Epics, previous stories, and Git history to build a solid foundation for the new story.

## EXECUTION PROTOCOLS:
- 🎯 Deep analysis of available artifacts
- 💾 Extract key requirements into memory/context

## INSTRUCTIONS:

### 1. Discover Inputs
Identify available files matching patterns:
- Epics: `{output_folder}/*epic*.md`
- PRD: `{output_folder}/*prd*.md`
- Architecture: `{output_folder}/*architecture*.md`
- Review findings.

### 2. Epic Analysis
Load the relevant Epic file ({{epic_num}}).
- Extract "Epic Objectives" and "Business Value".
- Extract THIS specific story's requirements (User Story, AC).
- Extract technical constraints listed in the Epic.

### 3. Previous Story Intelligence
Check if {{story_num}} > 1.
- IF YES: Look for `{{story_dir}}/{{epic_num}}-{{previous_story_num}}-*.md`.
- IF FOUND: Read it. Extract "Dev Notes", "Learnings", "Testing Approaches".

### 4. Git Intelligence
Check if this is a git repo.
- IF YES: Get last 5 commit titles.
- Analyze patterns relevant to this story (naming, file locations).

### 5. Present MENU OPTIONS

Display: "**Artifact Analysis Complete.**"
Display: "**Select an Option:** [A] Advanced Elicitation [P] Party Mode [C] Continue to Architecture"

#### Menu Handling Logic:
- IF A: Execute {advancedElicitationTask}
- IF P: Execute {partyModeWorkflow}
- IF C: Load, read entire file, then execute {nextStepFile}

#### EXECUTION RULES:
- ALWAYS halt and wait for user input after presenting menu
- ONLY proceed to next step when user selects 'C'
