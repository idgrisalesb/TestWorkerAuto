---
name: 'step-02-setup'
description: 'Configure and validate Jira integration using direct API via shared OAuth infrastructure'

# Path Definitions
workflow_path: '{project-root}/_siesa-agents/bmm/workflows/sync-epics-stories'

# File References
thisStepFile: '{workflow_path}/steps/step-02-setup.md'
nextStepFile: '{workflow_path}/steps/step-03-scope.md'
outputFile: '{project-root}/_bmad-output/jira_docs/project_config.yaml'

# Jira CLI Scripts (MUST use these — never write inline Node.js)
scriptsPath: '{project-root}/_siesa-agents/scripts/jira'

# OAuth Infrastructure (shared with get-features — scripts auto-discover these)
oauthConfig: '{project-root}/.claude/commands/get-features/oauth-config.json'
tokensFile: '{project-root}/.claude/commands/get-features/tokens.json'
oauthLoginScript: '{project-root}/.claude/commands/get-features/oauth-login.js'

---

# Step 2: Jira Configuration & Setup

## STEP GOAL:

To authenticate against the Jira API using the shared OAuth infrastructure, validate project access, and save the configuration file.

## MANDATORY EXECUTION RULES:

- 🛑 NEVER generate content without user input
- 📖 CRITICAL: Read the complete step file before taking any action
- 📋 YOU ARE A JIRA INTEGRATION SPECIALIST
- 🔒 **API ONLY:** All Jira interactions must use direct Node.js HTTPS calls. NEVER use MCP tools, `fetch`, or `curl`.
- ♻️ **SHARED AUTH:** Reuse the OAuth infrastructure at `.claude/commands/get-features/`. Never duplicate credential files.

---

## EXECUTION SEQUENCE:

### 1. 🔒 PRE-FLIGHT CHECK: OAuth Authentication

**CRITICAL FIRST STEP:** Verify valid tokens exist before any Jira call.

**Action:** Check if `{tokensFile}` exists and contains a `refresh_token`.

**Case A — No `tokens.json` or no `refresh_token`:**

- Inform the user:
  ```
  Opening browser for Jira login...
  Waiting for authentication to complete.
  ```
- Run: `node .claude/commands/get-features/oauth-login.js`
- Wait until `tokens.json` is written with a valid `refresh_token`.
- Once complete, proceed to Case B.

**Case B — `tokens.json` exists with `refresh_token`:**

- Silently refresh the access token using inline Node.js:
  - Read `{oauthConfig}` → extract `client_id`, `client_secret`
  - Read `{tokensFile}` → extract `refresh_token`
  - `POST https://auth.atlassian.com/oauth/token` with body:
    ```json
    { "grant_type": "refresh_token", "client_id": "...", "client_secret": "...", "refresh_token": "..." }
    ```
  - Save the new `access_token` (and `refresh_token` if returned) back to `{tokensFile}`.

**Failure condition:** If the refresh fails (HTTP error or empty response):
- Display: `❌ Token refresh failed. Please re-authenticate.`
- Return to **Case A** (run oauth-login.js).

**DO NOT PROCEED** past this section without a valid `access_token`.

---

### 2. Resolve Jira Instance

**Action:** Using the valid `access_token`, call via Node.js:

```
GET https://api.atlassian.com/oauth/token/accessible-resources
Authorization: Bearer {access_token}
```

- Read `{oauthConfig}` → check `default_instance`.
- **If `default_instance` is set:** Use that `cloudId` silently, no prompt.
- **If `default_instance` is null or missing:**
  - Display the list of available instances to the user.
  - Prompt: "Which Jira instance do you want to use? Enter the number."
  - Use a temporary readline `.js` file for input; delete it after use.
  - Save the selected instance as `default_instance` in `{oauthConfig}`.

Store `cloud_id` and `jira_url` (instance URL, e.g. `https://siesa-team.atlassian.net`) for use in subsequent steps.

---

### 3. Check Existing Configuration

Check if `{outputFile}` exists.

- **If YES:** Read and display current settings (Project Key, Cloud ID, Jira URL).
  - Ask: "Do you want to use this configuration? [Y/N]"
  - **If Y:** Skip to Section 6 (Continue).
  - **If N:** Proceed to Section 4.
- **If NO:** Proceed to Section 4.

---

### 4. Elicit Project Key

Ask: "Please enter your Jira Project Key (e.g., PPS, SCRUM):"

Wait for user input.

---

### 5. Validate Project Access

**Action:** Using Node.js, call:

```
GET https://api.atlassian.com/ex/jira/{cloud_id}/rest/api/3/project/{project_key}
Authorization: Bearer {access_token}
```

- **Success (HTTP 200):** Extract and confirm `project name` and `key`. Display confirmation to user.
- **Failure (4xx/5xx):**
  - Display: `❌ Cannot access project '{project_key}'. Please verify the key and your permissions.`
  - Return to Section 4.

---

### 6. Save Configuration

Create or overwrite `{outputFile}` with:

```yaml
project_key: "{{project_key}}"
project_name: "{{project_name}}"
cloud_id: "{{cloud_id}}"
jira_url: "{{jira_url}}"
```

Where `jira_url` is the Atlassian instance URL (e.g. `https://siesa-team.atlassian.net`).

---

### 7. Present MENU OPTIONS

Display: "**✅ Configuration Complete**"
Display: "**Select an Option:** [C] Continue to Scope Selection"

#### Menu Handling Logic:

- **IF C:** Load, read entire file, then execute `{nextStepFile}`.

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- Valid `access_token` obtained via shared OAuth infrastructure
- Valid `project_config.yaml` created with correct `cloud_id` and `project_key`
- Project access confirmed via direct API

### ❌ SYSTEM FAILURE:

- Using MCP tools for any Jira operation
- Creating config with unvalidated credentials
- Duplicating OAuth credential files

**Master Rule:** Skipping steps, optimizing sequences, or not following exact instructions is FORBIDDEN and constitutes SYSTEM FAILURE.
