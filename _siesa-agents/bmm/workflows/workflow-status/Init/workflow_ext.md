# MANDATORY RULE: WORKFLOW-INIT — SIESA BASE REPOSITORY CLONING

**TRIGGER:** Every time `workflow-init` is executed (`/bmad:bmm:workflows:workflow-init`).

**CONTEXT TO INJECT:** Load and hold these rules in memory. Apply them at the end of the workflow as described in Section 1.

---

## 1. Step 10: Clone Siesa Base Repositories

This step executes **immediately after Step 9**, and **only if** the user confirmed creating the tracking file (answered "y"). If the user skipped Step 9 (answered "n"), skip this step entirely.

### 1.1 Resolve project root

Before running any command, determine the actual absolute path of `{project-root}`.
This is the **current working directory** of the agent at runtime — the project folder where `_bmad/` and `_siesa-agents/` are installed.
Use this resolved path in all subsequent commands. Do **not** pass the literal string `{project-root}` to the shell.

### 1.2 Present menu to the user

Use the **AskUserQuestion** tool to present the following options:

> "To complete the project setup, I can clone the Siesa base repositories into the `apps/` folder. What would you like to clone?"
>
> **[1] Frontend + Backend** — Clone both base repositories.
> **[2] Backend only** — Clone `BaseBackend` only.
> **[3] Skip** — Do not clone any repository.

### 1.3 Execution logic per selection

**For options [1] and [2] — ensure `apps/` exists first:**

```bash
mkdir -p <resolved-project-root>/apps
```

**[1] Frontend + Backend:**

Create base Architecture
Copy the file `@_siesa-agents/resources/architecture/architecture-both.md ` to `{planning_artifacts}/architecture.md`.

  - If the destination directory does not exist, create it first.
  - Do not modify the file contents — copy as-is.
  - After copying, confirm the file exists at the destination.

Create base UX/UI specifications
Copy the file `@_siesa-agents/resources/ux-ui/ux-design-specification.md` to `{planning_artifacts}/ux-design-specification.md.md`.

  - If the destination directory does not exist, create it first.
  - Do not modify the file contents — copy as-is.
  - After copying, confirm the file exists at the destination.

Check and clone Frontend:
```bash
# Only run if apps/Frontend does NOT exist
git clone https://github.com/SiesaTeams/BaseFrontend.git <resolved-project-root>/apps/Frontend
```

Check and clone Backend:
```bash
# Only run if apps/Backend does NOT exist
git clone https://github.com/SiesaTeams/BaseBackend.git <resolved-project-root>/apps/Backend
```

**[2] Backend only:**

Create base Architecture
Copy the file `@_siesa-agents/resources/architecture/architecture-single-backend.md ` to `{planning_artifacts}/architecture.md`.

  - If the destination directory does not exist, create it first.
  - Do not modify the file contents — copy as-is.
  - After copying, confirm the file exists at the destination.

Check and clone Backend:
```bash
git clone https://github.com/SiesaTeams/BaseBackend.git <resolved-project-root>/apps/Backend
```

**[3] Skip:** Do not execute any command. Proceed to the closing message.

### 1.4 Pre-clone existence check

Before running each `git clone`, verify whether the target directory already exists:

- If `apps/Frontend` already exists → do **not** clone it; inform the user:
  > "⚠️ `apps/Frontend` already exists. Skipping Frontend clone."

- If `apps/Backend` already exists → do **not** clone it; inform the user:
  > "⚠️ `apps/Backend` already exists. Skipping Backend clone."

Continue with the remaining repo if only one was skipped.

### 1.5 Error handling

If a `git clone` command fails (network error, auth issue, etc.):

1. Show the exact error output to the user.
2. Ask: "❌ Could not clone `{repo-name}`. Would you like to retry? (y/n)"
3. If "y": retry the same command once.
4. If "n" or second failure: skip that repo and continue.

### 1.6 Confirmation output

After completing the cloning (success or partial), display a summary:

```
✅ Base repositories cloned into: <resolved-project-root>/apps/

  Frontend  →  apps/Frontend   (https://github.com/SiesaTeams/BaseFrontend.git)
  Backend   →  apps/Backend    (https://github.com/SiesaTeams/BaseBackend.git)

Project structure is ready. Happy building! 🚀
```

Adapt the message if only one repo was cloned or if any were skipped.

---

## 2. Critical Rules

1. **This step is mandatory in the flow** — once the menu is presented, the agent MUST act on the user's selection.
2. **Do NOT modify Steps 1–9** of the base `workflow-init`. This extension only appends behavior at the end.
3. **Always use the resolved absolute path** when running Bash commands. Never pass the literal string `{project-root}` to the shell — substitute it with the actual path first.
4. **Each `git clone` runs as a single independent Bash tool call** using the full absolute target path as the destination argument — do not rely on `cd` to set context across calls.
5. **Condition gate** — if the user did not confirm Step 9 (answered "n"), this entire step is skipped without presenting the menu.

---

## 3. MANDATORY RULE — PHASE BRANCH CREATION AT WORKFLOW START

**TRIGGER:** Immediately when the user initiates this workflow (e.g., `/bmad:bmm:workflows:workflow-init`).

**CRITICAL INSTRUCTION:** Before executing any workflow step, you MUST invoke the `generate-commits-by-phase` skill to create the Phase 1 discovery branch.

### EXECUTION STEPS (PERFORM THESE ACTIONS NOW, BEFORE ANYTHING ELSE)

**STEP 1: INVOKE THE SKILL — CREATE PHASE 1 BRANCH**

Run the skill `generate-commits-by-phase` with **Operation A: Create Phase Branch** for **Phase 1 (discovery)**:

```bash
node _siesa-agents/scripts/phases/phase1.js
```

- If the `discovery` branch already exists, the script will report it — continue normally.
- If it is created successfully, confirm to the user and proceed.

**STEP 2: CONFIRM AND CONTINUE**

Output to the user:
> `✅ Phase 1 (discovery) branch ready. Proceeding with workflow-init...`

**DO NOT proceed to the workflow steps until this rule is fully executed.**

---

## 4. MANDATORY RULE — PHASE COMMIT AT WORKFLOW END

**TRIGGER:** Immediately after all workflow steps complete (including Section 1 — repository cloning).

**CRITICAL INSTRUCTION:** As the final action of this workflow, you MUST invoke the `generate-commits-by-phase` skill to commit all changes for Phase 1.

### EXECUTION STEPS (PERFORM THESE ACTIONS AT THE END)

**STEP 1: INSPECT CHANGES**

Before committing, inspect the repository state:

1. Run `git status --short` to identify which files were created or modified.
2. Run `git diff --stat` to understand the scope of changes.

**STEP 2: GENERATE COMMIT MESSAGE**

Build a concise commit message using the format:
`[Phase 1 - Discovery] <brief description of what was produced>`

**Example:** `[Phase 1 - Discovery] initialize project structure and clone base repositories`

Write the message in the same language used throughout the conversation.

**STEP 3: INVOKE THE SKILL — COMMIT PHASE 1 CHANGES**

Run the skill `generate-commits-by-phase` with **Operation B: Commit All Changes** for **Phase 1 (discovery)**:

```bash
node _siesa-agents/scripts/phases/phase1.js --commit "<generated commit message>"
```

**STEP 4: CONFIRM COMPLETION**

Output to the user:
> `✅ Project initialization changes committed to Phase 1 (discovery) branch.`

**This is the LAST action of the workflow. Do not execute any further steps after this commit.**
