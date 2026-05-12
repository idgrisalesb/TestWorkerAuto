---
name: 'step-06-jira-sync'
description: 'Synchronize completion status with Jira and update documentation'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/4-implementation/code-review'

# File References
thisStepFile: '{workflow_path}/steps/step-06-jira-sync.md'
workflowFile: '{workflow_path}/workflow.md'
outputFile: '{output_folder}/review-{story_key}.md'
nextStepFile: '{workflow_path}/steps/step-07-commit-push.md'

# User Defined References
storyFile: '{{story_path}}'
---

# Step 6: Sync with Jira

## STEP GOAL:
To synchronize the "Done" status with Jira by transitioning the Story and its Subtasks, and updating the story document to reflect this synchronization.

## MANDATORY EXECUTION RULES:
- 🛑 ONLY execute if status is 'done'
- 🧱 Use Pattern B (Cascading Updates) for Jira: Always discover transitions before executing
- 📄 Update tables in Markdown without breaking format or losing data
- ⚠️ **NON-BLOCKING**: If any Jira operation fails (Auth, Transitions, API), Log the error and PROCEED to the final transition step. Do NOT stop execution.

## Sequence of Instructions

### 1. Conditional Execution Checker

<check if="{{new_status}} == 'done'">

  ### 2. Validation of Requirements

  1. **Validate Auth**: Check if you can access Jira resources.
     <action>Call `mcp__atlassian__getAccessibleAtlassianResources` or `mcp__atlassian__atlassianUserInfo`.</action>

     <check if="Auth failed or no resources returned">
        <output>❌ **MCP Authentication Failed.** I cannot connect to Jira. Please ensure you are authenticated with the Atlassian MCP server.</output>
        <output>Run the following command to authenticate (copy and paste into your terminal/chat):</output>
        <display>
        ```bash
        /mcp auth mcp-atlassian
        ```
        </display>
        <output>
        ℹ  Note: Authentication requires completing an OAuth flow in your web browser.
           Follow the on-screen instructions provided by the CLI after running the command.
        </output>
        <output>After validating in the browser, please choose an option:</output>
        <menu>
           <item cmd="R" action="restart_step2">Retry Authentication (Re-run check)</item>
           <item cmd="S" action="continue">Skip Jira Sync & Continue</item>
           <item cmd="E" action="exit">Exit Workflow</item>
        </menu>
        <logic>
            <if selection="R">Restart this Step 2 from the beginning.</if>
            <if selection="S">Log warning about skipping Jira sync and proceed directly to Section 6 "Transition to Next Step".</if>
            <if selection="E">Terminate the workflow with a message: "Workflow aborted due to authentication failure."</if>
        </logic>
     </check>

  2. **Load Configuration**:
     <action>Ensure `{cloud_id}` is available from `project_config.yaml`. If not, load it.</action>

  3. **Validate Story Integrity**:
     <action>Read `{story_path}`.</action>
     <check if="content does NOT contain '## Jira Information' OR content does NOT contain '## Synced Tasks'">
        <output>
        ⚠️ **WARNING: Missing Jira Sections**
        La historia no está vinculada a Jira. Se omitirá la sincronización.
        </output>
        <action>Proceed directly to Section 6 "Transition to Next Step".</action>
     </check>

  ### 3. Jira Transition Execution (Pattern B)

  <check if="Any MCP Exception occurs in this section">
    <action>Log error "Jira Transition Failed" and PROCEED next instruction.</action>
  </check>

  1. **Extract Key**: Identify the Jira Key (e.g., PIJB-62) from the story content. Let's call it `{{jira_key}}`.

  2. **Transition Parent Story**:
     - **Discovery**: Call `mcp__atlassian__getTransitionsForJiraIssue(issueIdOrKey="{{jira_key}}", cloudId="{{cloud_id}}")`.
     - **Select**: Find the transition ID where `to.statusCategory.key` == "done" (or name "Listo"/"Finalizada"/"Done").
     - **Execute**: Call `mcp__atlassian__transitionJiraIssue(issueIdOrKey="{{jira_key}}", transition={id: "FOUND_ID"}, cloudId="{{cloud_id}}")`.
     - <output>✅ Historia {{jira_key}} movida a Done en Jira.</output>

  3. **Transition Subtasks (Cascade)**:
     - **Fetch Hierarchy**: Call `mcp__atlassian__getJiraIssue(issueIdOrKey="{{jira_key}}", cloudId="{{cloud_id}}")`.
     - **Iterate**: For each subtask in `fields.subtasks`:
       - **Discovery**: Call `getTransitionsForJiraIssue` for the subtask key (transitions vary by ID).
       - **Select**: Find the "Done" transition ID.
       - **Execute**: Call `transitionJiraIssue` for the subtask.
     - <output>✅ Subtareas movidas a Done.</output>

  ### 4. Update Markdown Tables

  Modify `{{story_path}}` to reflect the new state:

  <action>
  1. Read `{{story_path}}`.
  2. Locate `## Jira Information`: Add `| Jira State |` to header, `|---|` to divider, `| **Done** |` to data row.
  3. Locate `## Synced Tasks`: Add `| Jira State |` to header, `|---|` to divider (if needed), and `| **Done** |` to each task row.
  4. Save the file.
  </action>

  ### 5. Final Log

  <action>Append to `{outputFile}`:</action>
  <template-output>
  ## Jira Sync
  - **Story Transition**: Success
  - **Subtasks Transitioned**: All moved to Done
  - **Document Tables**: Updated with 'Done' state
  </template-output>

</check>

<check if="{{new_status}} != 'done'">
  <output>Status is '{{new_status}}'. Skipping Jira sync because code review outcome is not 'done'.</output>
</check>

### 6. Transition to Next Step
<action>Update frontmatter of `{outputFile}`: `stepsCompleted: [1, 2, 3, 4, 5, 6]`</action>

<output>Jira sync completed. Ready to commit and push changes.</output>

<menu>
   <item cmd="C" action="load_step" file="{nextStepFile}">Continue to Commit & Push</item>
   <item cmd="E" action="exit">Exit Workflow (Skip Commit/Push)</item>
</menu>
