---
name: 'step-06-finalize'
description: 'Update sprint status and finalize'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/4-implementation/create-story'

# File References
thisStepFile: '{workflow_path}/steps/step-06-finalize.md'
workflowFile: '{workflow_path}/workflow.md'

# Variables
sprint_status: '{implementation_artifacts}/sprint-status.yaml || {output_folder}/sprint-status.yaml'

# Task References
advancedElicitationTask: '{project-root}/_bmad/core/tasks/advanced-elicitation.xml'
partyModeWorkflow: '{project-root}/_bmad/core/workflows/party-mode/workflow.md'
---

# Step 6: Finalize & Handover

## STEP GOAL:
To update the project tracking (sprint status) and confirm the story is ready for development.

## EXECUTION PROTOCOLS:
- 🎯 Update sprint-status.yaml
- 🏁 Complete workflow

## INSTRUCTIONS:

### 1. Update Sprint Status
Load `{sprint_status}`.
- Find `development_status` for {{story_key}}.
- Update status from "backlog" to "ready-for-dev".

#### 1a. Update Epic Last-Update Date (MANDATORY)
Execute the following algorithm every time, without exception:

```
ALGORITHM: epic-last-update
─────────────────────────────────────────────────────────────
INPUT  : story_key  (e.g. "2-1-units-of-measure-listview")
         epic_num   (already in memory from step-01)
OUTPUT : sprint-status.yaml updated (only the epic field)

STEP 1 — Derive field key
  field_key = "epic-" + {{epic_num}} + "-last-update"
  // e.g. epic_num=2  →  field_key = "epic-2-last-update"

STEP 2 — Get today's date
  today = system date in format DD-MM-YYYY
  // e.g. 24-02-2026

STEP 3 — Locate field in sprint-status.yaml
  Search development_status section for a line that matches:
    /^\s*{field_key}:\s*.*/
  CASE A — line found:
    Replace the value with today's date.
    Result: "  epic-2-last-update: 24-02-2026"
  CASE B — line NOT found:
    LOG warning: "WARNING: {field_key} not found in sprint-status.yaml"
    Do NOT create the field. Do NOT modify any other line. Continue.

STEP 4 — Safety constraints (STRICT)
  ✅ Only modify the single line matching {field_key}
  ✅ Only update the epic corresponding to {{epic_num}}
  ❌ Do NOT touch other epic-*-last-update fields
  ❌ Do NOT alter story status entries
  ❌ Do NOT change epic status (backlog / in-progress / done)
  ❌ Do NOT reformat or reorder the YAML file

STEP 5 — Save file
  Write the updated sprint-status.yaml to disk.
─────────────────────────────────────────────────────────────
```

### 2. Validation (Optional)
Run validation check on the generated story file (structure check).

### 3. Final Report
Display:
```markdown
**🎯 TARGET LOCKED: Story {{story_key}} Ready for Dev!**

**Details:**
- File: {{story_file}}
- Status: ready-for-dev
- UI Mode: {{has_ui_component}} (siesa-ui-kit required: {{has_ui_component}})

**Next Action:**
- Run `dev-story` to begin implementation.
```

### 4. Present MENU OPTIONS

Display: "**Workflow Complete.**"
Display: "**Select an Option:** [A] Advanced Elicitation [P] Party Mode [C] Finish"

#### Menu Handling Logic:
- IF A: Execute {advancedElicitationTask}
- IF P: Execute {partyModeWorkflow}
- IF C: EXIT workflow (Process Complete)

#### EXECUTION RULES:
- ALWAYS halt and wait for user input after presenting menu
- ONLY proceed/exit when user selects 'C'
