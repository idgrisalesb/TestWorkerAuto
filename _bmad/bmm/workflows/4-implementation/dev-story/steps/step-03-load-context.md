---
name: 'step-03-load-context'
description: 'Load project context and story information'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/4-implementation/dev-story'

# File References
thisStepFile: '{workflow_path}/steps/step-03-load-context.md'
nextStepFile: '{workflow_path}/steps/step-04-env-readiness.md'
projectContext: '{project-root}/_bmad-output/project-context.md'
---

# Step 3: Load Context

## STEP GOAL:

Load all available context to inform implementation, including coding standards, project-wide patterns, and specific story requirements.

## EXECUTION PROTOCOLS:

### 1. Load Project Context

1.  Load `{projectContext}` (if exists) for coding standards and project-wide patterns.
2.  Review architectural guidelines, tech stack details, and implementation patterns.

### 2. Deep Dive Story Context

1.  Re-read the **Dev Notes** section of the Story file.
2.  Extract developer guidance:
    *   Architecture requirements.
    *   Previous learnings.
    *   Technical specifications.
3.  Use this enhanced context to inform implementation decisions.

### 3. Output Status

Display:
```
✅ Context Loaded
Story and project context available for implementation.
```

### 4. Next Step

Load, read entire file, then execute `{nextStepFile}` (`step-04-env-readiness.md`).
