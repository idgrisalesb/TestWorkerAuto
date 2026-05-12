---
name: 'step-04-env-readiness'
description: 'Analyze dependencies and ensure environment readiness'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/4-implementation/dev-story'

# File References
thisStepFile: '{workflow_path}/steps/step-04-env-readiness.md'
nextStepFile: '{workflow_path}/steps/step-05-review-check.md'
---

# Step 4: Environment Readiness & UI Kit Check

## STEP GOAL:

Analyze tasks for UI requirements and ensure `siesa-ui-kit` is properly installed and configured if needed.

## EXECUTION PROTOCOLS:

### 1. Analyze for UI Requirements

Scan the Story's Tasks and Acceptance Criteria for UI-related keywords:
*   `table`, `form`, `view`, `css`, `style`, `component`
*   `dark mode`, `modal`, `button`, `input`, `grid`, `layout`
*   `theme`, `icon`, `frontend`, `interface`, `screen`
*   `dialog`, `popup`, `widget`, `dashboard`, `chart`, `visualization`

### 2. UI Kit Enforcement

**IF NO UI keywords found:**
1.  Output: `ℹ️ No specific UI tasks detected. Skipping siesa-ui-kit check.`

**IF UI keywords found:**
1.  **Install/Update**: Run `npm install siesa-ui-kit@latest`.
    *   Output: `✅ siesa-ui-kit ensured at latest version.`
2.  **Verify Import**:
    *   Locate project main entry file (`src/app/layout.tsx`, `src/main.jsx`, etc.).
    *   Read content to check for `siesa-ui-kit/styles.css`.
    *   **If missing**: Add `import 'siesa-ui-kit/styles.css'` (or equivalent).
    *   Output: `✅ Verified/Added 'siesa-ui-kit/styles.css' import.`

### 3. Next Step

Load, read entire file, then execute `{nextStepFile}` (`step-05-review-check.md`).
