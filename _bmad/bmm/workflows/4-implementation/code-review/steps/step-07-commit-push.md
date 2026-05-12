---
name: 'step-07-commit-push'
description: 'Safely commit and push verified code following centralized GitFlow guidelines'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/4-implementation/code-review'

# File References
thisStepFile: '{workflow_path}/steps/step-07-commit-push.md'
workflowFile: '{workflow_path}/workflow.md'
outputFile: '{output_folder}/review-{story_key}.md'

# Data References
sprint_status_file: '{implementation_artifacts}/sprint-status.yaml'

# Centralized GitFlow Guidelines
gitFlowGuide: '{project-root}/_bmad/bmm/data/git-flow-siesa.md'
---

# Step 7: Commit & Push

## STEP GOAL:

To securely persist the verified and approved code changes to the repository following the **centralized GitFlow guidelines** defined in `{gitFlowGuide}`.

## MANDATORY EXECUTION RULES:

- 📖 **LOAD AND READ** `{gitFlowGuide}` before any Git operation
- 🛑 ONLY execute if the story status is explicitly 'done' or 'completed'
- 🌳 Ensure development branch follows the naming convention from the centralized guide
- 📝 Commit messages must follow the standard from `{gitFlowGuide}` (Conventional Commits)

## Sequence of Instructions

### 1. Load GitFlow Guidelines

<action>
1. Load and read the entire file at `{gitFlowGuide}`.
2. Extract and apply:
   - **Commit Message Format**: From Section 3 (Conventional Commits)
   - **Governance Rules**: From Section 4 (lowercase, protected branches)
</action>

### 2. Verification of Status

**Goal**: Ensure we are authorized to push code.

<action>
1. Load `{sprint_status_file}`.
2. Find the entry for `{{story_key}}` under `development_status`.
3. Check if the value is `done` (or `completed`).
</action>

<check if="status != 'done' AND status != 'completed'">
  <output>
  ⚠️ **COMMIT ABORTED**: Story status is '{{status}}'.
  Changes are only committed and pushed when the story is marked as 'done'.
  </output>
  <action>STOP execution. Do NOT run git commands.</action>
</check>

### 3. Branch Validation

**Goal**: Ensure code is committed to the correct branch per GitFlow guidelines.

<check if="status == 'done' OR status == 'completed'">

  <action>
  1. Run `git branch --show-current` to get `current_branch`.
  2. Validate the branch follows the naming convention from `{gitFlowGuide}`:
     - Pattern: `{parent}-{team}-{owner}-{rq}-{description}`
     - Must be lowercase
     - Must NOT be `main` or `develop` (protected branches)
  </action>

  <check if="current_branch == 'main' OR current_branch == 'develop'">
      <output>
      🛑 **COMMIT BLOCKED**: Cannot commit directly to protected branch '{{current_branch}}'.
      Per GitFlow guidelines, please switch to your feature branch first.
      </output>
      <action>STOP execution.</action>
  </check>

  <check if="branch naming is valid">
      <output>✅ Branch '{{current_branch}}' follows GitFlow naming convention.</output>
  </check>

</check>

### 4. Git Operations

**Goal**: Persist changes following commit standards from `{gitFlowGuide}`.

<check if="status == 'done' OR status == 'completed'">

  1. **Stage Changes**:
     <action>Run command `git add .`</action>

  2. **Construct Commit Message**:
     <action>
     Per Section 3 of `{gitFlowGuide}`, use Conventional Commits format:
     - For features: `feat: {description}`
     - For fixes: `fix: {description}`

     Derive type from story context and construct message.
     </action>

  3. **User Confirmation**:
     <output>
     READY TO COMMIT:
     - Branch: {{current_branch}}
     - Message: "feat: implementation for story {{story_key}}"

     Do you want to proceed with the commit and push?
     </output>

     <menu>
        <item cmd="C" action="continue">Yes, Commit & Push</item>
        <item cmd="M" action="exit">No, Cancel (Manual Handling)</item>
     </menu>

     <logic>
       <if selection="M">
          <output>🚫 Commit cancelled by user.</output>
          <output>Changes are staged. You can now commit manually.</output>
          <action>Update frontmatter of `{outputFile}`: `stepsCompleted: [1, 2, 3, 4, 5, 6, 7]`</action>
          <action>EXIT</action>
       </if>
     </logic>

  4. **Commit Changes**:
     <action>Run command `git commit -m "feat: implementation for story {{story_key}}"`</action>
     <check if="Commit failed (no changes?)">
        <output>ℹ️ No changes to commit.</output>
     </check>

  5. **Push to Remote**:
     <action>
     1. Get current branch: `git branch --show-current`
     2. Push: `git push origin {{current_branch}}`
     </action>

     <check if="Push failed">
        <output>❌ **Push Failed**. Please check your network or permissions and try pushing manually.</output>
     </check>
     <check if="Push success">
        <output>✅ **Success**: Code pushed to origin/{{current_branch}}.</output>
     </check>

</check>

### 5. Final Logging

<action>Append to `{outputFile}`:</action>
<template-output>
## Repository Sync
- **Branch**: {{current_branch}}
- **Commit**: [Performed/Skipped]
- **Push**: [Performed/Skipped]
- **GitFlow Compliance**: ✅ Verified against `{gitFlowGuide}`
- **Status**: Workflow Completed Successfully
</template-output>

### 6. Workflow Completion

<output>
🎉 **Workflow Completed**
The code review cycle for **{{story_key}}** is finished.
All Git operations followed the centralized GitFlow guidelines.
</output>

<action>Update frontmatter of `{outputFile}`: `stepsCompleted: [1, 2, 3, 4, 5, 6, 7]`</action>

<action>EXIT workflow.</action>
