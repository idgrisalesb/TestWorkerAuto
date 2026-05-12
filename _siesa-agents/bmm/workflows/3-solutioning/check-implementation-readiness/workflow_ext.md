# MANDATORY RULES: CHECK-IMPLEMENTATION-READINESS WORKFLOW

---

## 1. MANDATORY RULE — PHASE BRANCH CREATION AT WORKFLOW START

**TRIGGER:** Immediately when the user initiates this workflow (e.g., `/check-implementation-readiness`).

**CRITICAL INSTRUCTION:** Before executing any workflow step, you MUST invoke the `generate-commits-by-phase` skill to create the Phase 3 solutioning branch.

### EXECUTION STEPS (PERFORM THESE ACTIONS NOW, BEFORE ANYTHING ELSE)

**STEP 1: INVOKE THE SKILL — CREATE PHASE 3 BRANCH**

Run the skill `generate-commits-by-phase` with **Operation A: Create Phase Branch** for **Phase 3 (solutioning)**:

```bash
node _siesa-agents/scripts/phases/phase3.js
```

- If the `solutioning` branch already exists, the script will report it — continue normally.
- If it is created successfully, confirm to the user and proceed.

**STEP 2: CONFIRM AND CONTINUE**

Output to the user:
> `✅ Phase 3 (solutioning) branch ready. Proceeding with Implementation Readiness check...`

**DO NOT proceed to the workflow steps until this rule is fully executed.**

---

## 2. MANDATORY RULE — PHASE COMMIT AT WORKFLOW END

**TRIGGER:** Immediately after all workflow steps complete and the readiness assessment has been generated/saved.

**CRITICAL INSTRUCTION:** As the final action of this workflow, you MUST invoke the `generate-commits-by-phase` skill to commit all changes for Phase 3.

### EXECUTION STEPS (PERFORM THESE ACTIONS AT THE END)

**STEP 1: INSPECT CHANGES**

Before committing, inspect the repository state:

1. Run `git status --short` to identify which files were created or modified.
2. Run `git diff --stat` to understand the scope of changes.

**STEP 2: GENERATE COMMIT MESSAGE**

Build a concise commit message using the format:
`[Phase 3 - Solutioning] <brief description of what was produced>`

**Example:** `[Phase 3 - Solutioning] add implementation readiness assessment for <project name>`

Write the message in the same language used throughout the conversation.

**STEP 3: INVOKE THE SKILL — COMMIT PHASE 3 CHANGES**

Run the skill `generate-commits-by-phase` with **Operation B: Commit All Changes** for **Phase 3 (solutioning)**:

```bash
node _siesa-agents/scripts/phases/phase3.js --commit "<generated commit message>"
```

**STEP 4: CONFIRM COMPLETION**

Output to the user:
> `✅ Implementation Readiness changes committed to Phase 3 (solutioning) branch.`

**This is the LAST action of the workflow. Do not execute any further steps after this commit.**
