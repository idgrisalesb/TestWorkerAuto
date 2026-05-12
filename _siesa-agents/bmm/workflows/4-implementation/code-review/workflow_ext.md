# MANDATORY RULE: CODE REVIEW WORKFLOW

**TRIGGER:** Every time the user requests a CODE REVIEW, such as `/code-review`.

**CONTEXT TO INJECT (apply throughout the entire workflow):**

The following rules must be kept in memory and applied at the appropriate moment without altering the standard workflow flow:

## 1. During step-01-load-story: use the following definition for point 3. Discover Git Changes

### 3. Discover Git Changes

1. Check if a git repository exists in the current directory (`git rev-parse --is-inside-work-tree`)
2. If yes:
   - Run `git worktree list` to find the route of the branch
   - Run `cd {{branch_route}}` to switch to the target branch
   - Run `git status --porcelain` to find uncommitted changes
   - Run `git diff --name-only` to see modified files
   - Run `git diff --cached --name-only` to see staged files
   - Compile a list of **Actual Changed Files**
3. If no:
   - Note that review will rely solely on Story's File List (Warning)

## 2. Sub-agents: only when invoked via quick-dev

Sub-agents **must NOT be used** when the code review workflow is invoked directly (e.g., `/code-review`). Sub-agents are only permitted when the workflow is triggered as part of **quick-dev** (e.g., `/quick-dev`).

- If invoked directly → follow the standard sequential workflow steps without spawning any sub-agents.
- If invoked from quick-dev → sub-agents may be used as defined by the quick-dev orchestration.
---

## 3. During step-06-jira-sync: REPLACE entirely with Automated sa-jira-sync-api

**TRIGGER CONDITION:** This override applies ONLY when `{{new_status}} == 'done'` (as determined in step-05-sync-sprint).

**BEHAVIOR:** Completely replace the base step-06 MCP-based logic with an automated, silent execution using the sa-jira-sync-api infrastructure (Node.js direct API). The user must NOT be shown any menus or prompts — display only brief status lines.

### Infrastructure References

- OAuth tokens: `{project-root}/.claude/commands/get-features/tokens.json`
- OAuth config: `{project-root}/.claude/commands/get-features/oauth-config.json`
- Jira config: `{project-root}/_bmad-output/jira_docs/project_config.yaml`
- Story sync step: `{project-root}/_siesa-agents/sa/sync-epics-stories/steps/step-05-stories.md`
- Story template: `{project-root}/_siesa-agents/sa/sync-epics-stories/data/templates/story-template.json`
- Task template: `{project-root}/_siesa-agents/sa/sync-epics-stories/data/templates/task-template.json`
- Subtask template: `{project-root}/_siesa-agents/sa/sync-epics-stories/data/templates/subtask-template.json`

### Automated Execution Sequence

#### A. Guard Check

If `{{new_status}} != 'done'`:
- Output: `ℹ️ Story status is '{{new_status}}'. Skipping Jira sync.`
- Immediately proceed to step-07 without any further action.

#### B. Load Jira Configuration (Silent)

1. Check if `{project-root}/_bmad-output/jira_docs/project_config.yaml` exists.
   - If NOT exists: Output `⚠️ No Jira config found (project_config.yaml). Skipping Jira sync.` then proceed to step-07.
   - If exists: Read and extract `project_key`, `cloud_id`, `jira_url`.

2. Refresh OAuth access token using inline Node.js:
   - Read `tokens.json` → extract `refresh_token`
   - Read `oauth-config.json` → extract `client_id`, `client_secret`
   - `POST https://auth.atlassian.com/oauth/token` with `grant_type: refresh_token`
   - Save new `access_token` (and `refresh_token` if returned) back to `tokens.json`
   - If refresh fails: Output `⚠️ OAuth token refresh failed. Skipping Jira sync.` then proceed to step-07.

Output: `🔄 Syncing story with Jira...`

#### C. Pre-configure Scope for This Story (Silent)

Inject the following values into `project_config.yaml` (append/overwrite these keys only):

```yaml
target_scope: stories_specific
target_names:
  - "{{story_title}}"
```

Where `{{story_title}}` is the H1 title extracted from the story file.

#### D. Execute Story Content Sync (sa-jira-sync-api Step-05 Logic, Silent Mode)

Load and execute the logic of `step-05-stories.md` from the sa-jira-sync-api workflow with the following **silent mode rules** (these override any interactive elements in that step file):

- **SKIP all menus** — do not display or wait for any user option (`[C]`, `[S]`, `[E]`, etc.)
- **SKIP the Pre-flight Epic validation prompts** — if an unsynced parent epic is found, log `⚠️ Parent Epic not yet synced to Jira. Story creation may fail.` and continue.
- **SKIP Section 8 (Present MENU OPTIONS)** — do not display final menu.
- Process ONLY the story matching `{{story_title}}` (enforced by `target_scope: stories_specific`).
- All Node.js API calls use the `access_token` refreshed in Section B.
- After this section: the story and all its tasks/subtasks exist in Jira and `{{jira_key}}` is available from the story file's `## Jira Information` section.

If story sync fails (API error):
- Output: `❌ Story sync failed: {{error}}. Skipping "done" transition.`
- Proceed to Section F (log) and then step-07.

#### E. Transition Story and All Subtasks to Done (Node.js, Silent)

After the story is confirmed in Jira (has `{{jira_key}}`):

1. **Transition Parent Story:**
   - Node.js: `GET https://api.atlassian.com/ex/jira/{{cloud_id}}/rest/api/3/issue/{{jira_key}}/transitions` with `Bearer {{access_token}}`
   - Find transition where `to.statusCategory.key == "done"` (or name contains "Done"/"Listo"/"Finalizada")
   - Node.js: `POST .../transitions` body: `{ "transition": { "id": "{{found_id}}" } }`
   - Output: `✅ {{jira_key}} → Done`

2. **Cascade: Transition all Subtasks:**
   - Node.js: `GET .../issue/{{jira_key}}` → extract `fields.subtasks`
   - For each subtask:
     - Get transitions: `GET .../issue/{{subtask_key}}/transitions`
     - Find "done" transition id
     - Execute: `POST .../issue/{{subtask_key}}/transitions` body: `{ "transition": { "id": "{{found_id}}" } }`
   - If any subtask transition fails: log `⚠️ Subtask {{subtask_key}} transition failed: {{error}}` and continue to next.
   - Output: `✅ Subtasks → Done`

3. **Update Markdown Tables in Story File:**
   - Read `{{story_path}}`
   - In `## Jira Information`: add column `| Jira State |` with value `| **Done** |`
   - In `## Synced Tasks`: add column `| Jira State |` with value `| **Done** |` for each row
   - Save file.

#### F. Append Result to Output File

Append to `{outputFile}`:

```markdown
## Jira Sync (Automated via sa-jira-sync-api)
- **Story**: {{story_title}}
- **Jira Key**: {{jira_key}}
- **Story Content Sync**: [Created/Updated/Skipped (already existed)]
- **Story Transition**: Done ✅
- **Subtasks Transitioned**: [N subtasks → Done ✅ / Failed: list]
- **Infrastructure**: Node.js direct API (OAuth shared with get-features)
```

Update frontmatter of `{outputFile}`: `stepsCompleted: [1, 2, 3, 4, 5, 6]`

Output: `✅ Jira sync complete. Proceeding to commit...`

Then **immediately load, read, and execute step-07-commit-push.md** — no menu, no waiting for user input.

# MANDATORY RULE: OBSERVABILITY EVENTS

**TRIGGER:** Every time the code-review workflow is executed.

**PURPOSE:** Emit lifecycle events to measure workflow duration per story. Events are sent to Loki for observability dashboards.

**SCRIPT PATH:** `{project_root}/_siesa-agents/observability/scripts/sa-emit.js`

## 4. After step-01 identifies the story (before proceeding to step-02)

Once `{{story_key}}` has been determined in step-01-load-story, and BEFORE proceeding to step-02, execute via Bash:

```bash
node "{project_root}/_siesa-agents/observability/scripts/sa-emit.js" --event workflow.started --story "{{story_key}}" --phase code-review
```

## 4.5. In step-04, when the user selects a fix option (before executing it)

When the user selects one of the fix options **[1], [2], or [3]**, emit `fix.started` BEFORE executing the option, then emit `fix.finished` AFTER it completes:

**When user selects [1] Fix automatically:**

```bash
node "{project_root}/_siesa-agents/observability/scripts/sa-emit.js" --event fix.started --story "{{story_key}}" --phase code-review --fix-option auto_fix
```
*(execute the fix)* then:
```bash
node "{project_root}/_siesa-agents/observability/scripts/sa-emit.js" --event fix.finished --story "{{story_key}}" --phase code-review --fix-option auto_fix
```

**When user selects [2] Create Action Items:**

```bash
node "{project_root}/_siesa-agents/observability/scripts/sa-emit.js" --event fix.started --story "{{story_key}}" --phase code-review --fix-option action_items
```
*(create the action items)* then:
```bash
node "{project_root}/_siesa-agents/observability/scripts/sa-emit.js" --event fix.finished --story "{{story_key}}" --phase code-review --fix-option action_items
```

**When user selects [3] Show Details:**

```bash
node "{project_root}/_siesa-agents/observability/scripts/sa-emit.js" --event fix.started --story "{{story_key}}" --phase code-review --fix-option show_details
```
*(show the details)* then:
```bash
node "{project_root}/_siesa-agents/observability/scripts/sa-emit.js" --event fix.finished --story "{{story_key}}" --phase code-review --fix-option show_details
```

## 5. In step-05, after updating sprint-status.yaml

After step-05-sync-sprint updates `sprint-status.yaml`, emit the transition based on the actual new status determined by the review outcome:

**If the review PASSED (story transitions to `done`):**

```bash
node "{project_root}/_siesa-agents/observability/scripts/sa-emit.js" --event status.changed --story "{{story_key}}" --phase code-review --from review --to done
```

**If the review FAILED and story goes back to `in-progress` (rework):**

```bash
node "{project_root}/_siesa-agents/observability/scripts/sa-emit.js" --event status.changed --story "{{story_key}}" --phase code-review --from review --to in-progress
```

## 6. In step-07, at the very end of the workflow (after commit/push completes)

At the end of step-07-commit-push, after the final output, execute via Bash:

```bash
node "{project_root}/_siesa-agents/observability/scripts/sa-emit.js" --event workflow.finished --story "{{story_key}}" --phase code-review
```

## Observability execution rules

- If any `sa-emit` call fails, log the error and **continue the workflow normally**. Observability must never block the workflow.
- Use the exact `{{story_key}}` value as resolved in step-01 (e.g., `1-1-user-authentication`).
- Do NOT wait for user confirmation to execute these commands — they are silent background operations.
