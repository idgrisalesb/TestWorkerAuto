---
name: 'step-04-web-research'
description: 'Web research for latest technical specifics'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/4-implementation/create-story'

# File References
thisStepFile: '{workflow_path}/steps/step-04-web-research.md'
nextStepFile: '{workflow_path}/steps/step-05-create-file.md'
workflowFile: '{workflow_path}/workflow.md'

# Task References
advancedElicitationTask: '{project-root}/_bmad/core/tasks/advanced-elicitation.xml'
partyModeWorkflow: '{project-root}/_bmad/core/workflows/party-mode/workflow.md'
---

# Step 4: Web Research & Verification

## STEP GOAL:
To ensure the developer has the absolute latest information on libraries (including `siesa-ui-kit` if relevant) and APIs.

## EXECUTION PROTOCOLS:
- 🎯 Research latest versions and best practices
- 💾 Summarize technical specifics for the story

## INSTRUCTIONS:

### 1. Identify Research Targets
Based on Architecture and Story:
- List critical libraries/frameworks.
- **Siesa Check**: If {{has_ui_component}} is TRUE, include `siesa-ui-kit` in research list (check for specific version requirements if public, or internal docs).

### 2. Execute Research
For each target:
- Find latest stable version.
- check for breaking changes relevant to this story.
- Find specific documentation links for required components.

### 3. Synthesize Findings
Create a "Latest Tech Info" block:
- "Library X v.Y.Z recommended"
- "Specific API endpoint documentation: [Link]"
- "Security alerts: [Details]"

### 4. Present MENU OPTIONS

Display: "**Tech Research Complete.**"
Display: "**Select an Option:** [A] Advanced Elicitation [P] Party Mode [C] Continue to Creation"

#### Menu Handling Logic:
- IF A: Execute {advancedElicitationTask}
- IF P: Execute {partyModeWorkflow}
- IF C: Load, read entire file, then execute {nextStepFile}

#### EXECUTION RULES:
- ALWAYS halt and wait for user input after presenting menu
- ONLY proceed to next step when user selects 'C'
