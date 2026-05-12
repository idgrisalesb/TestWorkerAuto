# MANDATORY RULES: CREATE-UX-DESIGN WORKFLOW

---

## 1. MANDATORY RULE — PHASE BRANCH CREATION AT WORKFLOW START

**TRIGGER:** Immediately when the user initiates this workflow (e.g., `/create-ux-design`).

**CRITICAL INSTRUCTION:** Before executing any workflow step, you MUST invoke the `generate-commits-by-phase` skill to create the Phase 2 planning branch.

### EXECUTION STEPS (PERFORM THESE ACTIONS NOW, BEFORE ANYTHING ELSE)

**STEP 1: INVOKE THE SKILL — CREATE PHASE 2 BRANCH**

Run the skill `generate-commits-by-phase` with **Operation A: Create Phase Branch** for **Phase 2 (planning)**:

```bash
node _siesa-agents/scripts/phases/phase2.js
```

- If the `planning` branch already exists, the script will report it — continue normally.
- If it is created successfully, confirm to the user and proceed.

**STEP 2: CONFIRM AND CONTINUE**

Output to the user:
> `✅ Phase 2 (planning) branch ready. Proceeding with UX Design creation...`

**DO NOT proceed to the workflow steps until this rule is fully executed.**

---

## 2. INITIALIZATION — CHECK FOR EXISTING UX DESIGN DOCUMENT

Before executing any workflow step, search for an existing UX design document:

1. Look for a file matching `*ux-design-specification*.md` inside the `{planning_artifacts}/` folder.
   - Glob pattern to check: `{planning_artifacts}/*ux-design-specification*.md`

---

## 3. DECISION BRANCH

### If `ux-design-specification.md` EXISTS

Use the **AskUserQuestion** tool to present the following options (respect `communication_language` from config):

> Se encontró un documento de especificación UX/UI existente en `{planning_artifacts}/ux-design-specification.md`.
>
> ¿Qué deseas hacer?
>
> **[1] Editar** — Abrir el documento para revisarlo y modificarlo de forma colaborativa.
> **[2] Resumen** — Generar un resumen ejecutivo del documento actual.

Wait for the user's selection and act accordingly:

- **Option 1 — Edit:** Read the full contents of `{planning_artifacts}/ux-design-specification.md`, present it to the user section by section, and facilitate collaborative editing. Apply changes directly to the file using the Edit tool.
- **Option 2 — Summary:** Read the full contents of `{planning_artifacts}/ux-design-specification.md` and produce a concise executive summary covering: design vision, target users, design system decisions, visual foundations, component strategy, and any open design questions.

---

### If `ux-design-specification.md` does NOT EXIST

LOAD the FULL `@_bmad/bmm/workflows/2-plan-workflows/create-ux-design/workflow.md`, READ its entire contents and follow its directions exactly!

---

## 4. MANDATORY RULE — PHASE COMMIT AT WORKFLOW END

**TRIGGER:** Immediately after all workflow steps complete and the UX Design document has been generated/saved.

**CRITICAL INSTRUCTION:** As the final action of this workflow, you MUST invoke the `generate-commits-by-phase` skill to commit all changes for Phase 2.

### EXECUTION STEPS (PERFORM THESE ACTIONS AT THE END)

**STEP 1: INSPECT CHANGES**

Before committing, inspect the repository state:

1. Run `git status --short` to identify which files were created or modified.
2. Run `git diff --stat` to understand the scope of changes.

**STEP 2: GENERATE COMMIT MESSAGE**

Build a concise commit message using the format:
`[Phase 2 - Planning] <brief description of what was produced>`

**Example:** `[Phase 2 - Planning] add UX design document for <project name>`

Write the message in the same language used throughout the conversation.

**STEP 3: INVOKE THE SKILL — COMMIT PHASE 2 CHANGES**

Run the skill `generate-commits-by-phase` with **Operation B: Commit All Changes** for **Phase 2 (planning)**:

```bash
node _siesa-agents/scripts/phases/phase2.js --commit "<generated commit message>"
```

**STEP 4: CONFIRM COMPLETION**

Output to the user:
> `✅ UX Design changes committed to Phase 2 (planning) branch.`

**This is the LAST action of the workflow. Do not execute any further steps after this commit.**
