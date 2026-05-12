---
name: 'step-03-architecture'
description: 'Architecture analysis and tech stack validation'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/4-implementation/create-story'

# File References
thisStepFile: '{workflow_path}/steps/step-03-architecture.md'
nextStepFile: '{workflow_path}/steps/step-04-web-research.md'
workflowFile: '{workflow_path}/workflow.md'

# Variables
output_folder: '{implementation_artifacts}'

# Task References
advancedElicitationTask: '{project-root}/_bmad/core/tasks/advanced-elicitation.xml'
partyModeWorkflow: '{project-root}/_bmad/core/workflows/party-mode/workflow.md'
---

# Step 3: Architecture Intelligence & Compliance

## STEP GOAL:
To extract architectural constraints and SPECIFICALLY detect Frontend/UI requirements to enforce `siesa-ui-kit` usage.

## EXECUTION PROTOCOLS:
- 🎯 Analyze architecture documents
- 🕵️ Detect UI/Frontend requirements in the current story
- 💾 Set {{has_ui_component}} flag and {{siesa_instructions}}

## INSTRUCTIONS:

### 1. Load Architecture
Load `{output_folder}/*architecture*.md`.
- Analyze: Technical Stack, Code Structure, API Patterns, Database Schemas.

### 2. UI/Frontend Detection (CRITICAL)
Analyze the Story Requirements (from previous step) and Architecture.
- ASK: "Does this story involve creating views, components, or user interfaces?"
- LOOK FOR keywords: "Page", "View", "Button", "Form", "Screen", "UI", "Frontend", "React", "Vue", "Component".

### 3. Siesa UI Kit Enforcement
IF {{has_ui_component}} IS TRUE:
- **MANDATE**: Store the following requirements for the final story:
  1.  **Installation**: `npm install siesa-ui-kit` for installation.
  2.  **Usage**: "You MUST use components and patterns from `siesa-ui-kit` for all UI elements."
  3.  **Pattern**: "Do not build custom UI components if a `siesa-ui-kit` equivalent exists."
- Log: "✅ UI Story Detected - siesa-ui-kit requirements injected."

IF {{has_ui_component}} IS FALSE:
- Log: "ℹ️ No specific UI requirements detected. Standard backend/logic rules apply."

### 4. Extract Other Constraints
- Security: Auth/Authz rules.
- Performance: Caching, specific queries.
- Testing: Standards for this module.

### 5. Present MENU OPTIONS

Display: "**Architecture & UI Analysis Complete.**"
Display: "**UI Detected:** {{has_ui_component}}"
Display: "**Select an Option:** [A] Advanced Elicitation [P] Party Mode [C] Continue to Research"

#### Menu Handling Logic:
- IF A: Execute {advancedElicitationTask}
- IF P: Execute {partyModeWorkflow}
- IF C: Load, read entire file, then execute {nextStepFile}

#### EXECUTION RULES:
- ALWAYS halt and wait for user input after presenting menu
- ONLY proceed to next step when user selects 'C'
