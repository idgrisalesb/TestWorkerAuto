# MANDATORY RULES: CREATE-PRODUCT-BRIEF WORKFLOW

---

## RULE 1 — PHASE BRANCH CREATION AT WORKFLOW START

**TRIGGER:** Immediately when the user initiates the `create-product-brief` workflow (e.g., `/create-product-brief`).

**CRITICAL INSTRUCTION:** Before loading `workflow.md` or executing any workflow step, you MUST invoke the `generate-commits-by-phase` skill to create the Phase 1 discovery branch.

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
> `✅ Phase 1 (discovery) branch ready. Proceeding with Product Brief creation...`

**DO NOT proceed to `workflow.md` until this rule is fully executed.**

---

## RULE 2 — PHASE COMMIT AT WORKFLOW END

**TRIGGER:** Immediately after the `create-product-brief` workflow completes all its steps and the Product Brief document has been generated/saved.

**CRITICAL INSTRUCTION:** As the final action of this workflow, you MUST invoke the `generate-commits-by-phase` skill to commit all changes for Phase 1.

### EXECUTION STEPS (PERFORM THESE ACTIONS AT THE END)

**STEP 1: INSPECT CHANGES**

Before committing, inspect the repository state:

1. Run `git status --short` to identify which files were created or modified.
2. Run `git diff --stat` to understand the scope of changes.

**STEP 2: GENERATE COMMIT MESSAGE**

Build a concise commit message using the format:
`[Phase 1 - Discovery] <brief description of what was produced>`

**Example:** `[Phase 1 - Discovery] add product brief for <project name>`

Write the message in the same language used throughout the conversation.

**STEP 3: INVOKE THE SKILL — COMMIT PHASE 1 CHANGES**

Run the skill `generate-commits-by-phase` with **Operation B: Commit All Changes** for **Phase 1 (discovery)**:

```bash
node _siesa-agents/scripts/phases/phase1.js --commit "<generated commit message>"
```

**STEP 4: CONFIRM COMPLETION**

Output to the user:
> `✅ Product Brief changes committed to Phase 1 (discovery) branch.`

**This is the LAST action of the workflow. Do not execute any further steps after this commit.**
