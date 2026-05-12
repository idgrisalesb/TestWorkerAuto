---
name: 'step-05-create-file'
description: 'Create comprehensive story file'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/4-implementation/create-story'

# File References
thisStepFile: '{workflow_path}/steps/step-05-create-file.md'
nextStepFile: '{workflow_path}/steps/step-06-finalize.md'
workflowFile: '{workflow_path}/workflow.md'
templateFile: '{workflow_path}/template.md'

# Variables
story_dir: '{implementation_artifacts}'

# Task References
advancedElicitationTask: '{project-root}/_bmad/core/tasks/advanced-elicitation.xml'
partyModeWorkflow: '{project-root}/_bmad/core/workflows/party-mode/workflow.md'
---

# Step 5: Create Ultimate Story File

## STEP GOAL:
To generate the final `.md` story file containing ALL gathered context, requirements, and specifically the `siesa-ui-kit` mandates if applicable.

## EXECUTION PROTOCOLS:
- 🎯 Assemble the story file
- 💾 Write to `{{story_dir}}/{{story_key}}.md`

## INSTRUCTIONS:

### 1. Initialize File
Create/Overwrite: `{{story_dir}}/{{story_key}}.md`.

### 2. Write Header & Status
- Title: Story {{epic_num}}.{{story_num}}: {{story_title}}
- Status: **ready-for-dev**

### 3. Write Story & AC
- User Story Format (As a... I want... So that...)
- Detailed Acceptance Criteria (from Step 2).

### 4. Write Technical Implementation Guide (CRITICAL)
- Architecture Patterns (from Step 3).
- **Tech Stack & Libraries**:
  - List all required libraries.
  - **UI MANDATE**: IF {{has_ui_component}} is TRUE:
    ```markdown
    ### 🎨 UI Implementation Requirements (MANDATORY)
    - **Library**: `siesa-ui-kit`
    - **Install**: `npm install siesa-ui-kit` (Ensure dependency is present)
    - **Usage**: You MUST use `siesa-ui-kit` components for all UI elements.
    - **Constraint**: Do not create custom components if a Kit equivalent exists.
    ```
- Testing Requirements.
- File Structure requirements.

### 5. Write Contextual Intelligence
- Previous Story Learnings (from Step 2).
- Git History Context (from Step 2).
- Latest Web Research (from Step 4).

### 6. Present MENU OPTIONS

Display: "**Story File Created: {{story_key}}.md**"
Display: "**Select an Option:** [A] Advanced Elicitation [P] Party Mode [C] Continue to Finalize"

#### Menu Handling Logic:
- IF A: Execute {advancedElicitationTask}
- IF P: Execute {partyModeWorkflow}
- IF C: Load, read entire file, then execute {nextStepFile}

#### EXECUTION RULES:
- ALWAYS halt and wait for user input after presenting menu
- ONLY proceed to next step when user selects 'C'
