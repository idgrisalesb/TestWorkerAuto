# MANDATORY RULES & EXTENSION: GENERATE-PROJECT-CONTEXT WORKFLOW

## EXECUTION ORDER (READ FIRST)

This file defines three sequential execution phases. You MUST follow this order strictly:

1. **Section 1 — Phase Branch Creation:** Execute FIRST, before any menu or workflow step.
2. **Section 2 — Initial Menu:** Execute SECOND, after the branch is confirmed ready.
3. **Section 3 — Phase Commit:** Execute LAST, after ALL `workflow.md` steps complete.

---

# ============================================================================
# SECTION 1: MANDATORY RULE — PHASE BRANCH CREATION AT WORKFLOW START
# ============================================================================

**TRIGGER:** Immediately when the user initiates this workflow (e.g., `/generate-project-context`).

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
> `✅ Phase 3 (solutioning) branch ready. Proceeding with Project Context menu...`

**DO NOT proceed to the workflow steps until this rule is fully executed.**

**After branch confirmation, proceed to Section 2: INITIAL MENU below.**

---

# ============================================================================
# SECTION 2: EXTENSION — INITIAL MENU FOR GENERATE-PROJECT-CONTEXT
# ============================================================================

> **TERMINOLOGY NOTE:** The phrases "EXTENSION COMPLETE" and "Extension work is now COMPLETE" that appear in the steps below refer ONLY to this menu portion being done. **Section 3 (Phase Commit) still applies at the very end of the entire workflow, after `workflow.md` finishes.**

## MANDATORY INSTRUCTION (READ FIRST):

Before initializing the context document creation, you MUST:
1. Load the project configuration to resolve paths
2. Verify if a General Project Context already exists
3. Present the appropriate menu to the user

**DO NOT proceed to `workflow.md` until this extension is fully completed and all in-memory variables are set.**

---

**PATH VARIABLES REFERENCE:**
- `{project_root}` = The root directory of the current project (current working directory).
- `{output_folder}` = Resolved from `{project_root}/_bmad/bmm/config.yaml` field `output_folder`.
- `{output_file}` = Set by this extension based on user selection. Passed in memory to all subsequent steps.
- `{selected_mode}` = Set by this extension: either `"general"` or `"feature-specific"`.
- `{feature_name}` = Set by this extension (only for feature-specific mode).

---

### STEP 0: LOAD PROJECT CONFIGURATION

**Before any file check or menu, you MUST resolve the configuration:**

1. Read the file `_bmad/bmm/config.yaml`
2. Extract and store in memory:
   - `output_folder` (e.g., `_bmad-output` or as specified)
   - `project_name`
   - `user_name`
   - `communication_language`
   - `document_output_language`
   - `user_skill_level`
3. If `config.yaml` does not exist or `output_folder` is not defined, default `output_folder` to `_bmad-output`.

---

### STEP 1: VERIFY EXISTING PROJECT CONTEXT

Check if the file `{output_folder}/project-context.md` exists.

---

#### ❌ IF THE FILE DOES NOT EXIST — EXECUTE THIS BLOCK AND STOP:

> 🛑 **DO NOT proceed to STEP 2. STEP 2 is FORBIDDEN in this path.**

1. Inform the user: *"⚠️ No se encontró un Project Context general. Primero se debe crear uno antes de poder generar preferencias técnicas por feature. Iniciando flujo general automáticamente..."*
2. Set in memory: `selected_mode = "general"`
3. Set in memory: `output_file = "{output_folder}/project-context.md"`
4. ⛔ **EXTENSION COMPLETE — Skip STEP 2 and STEP 3 entirely. Proceed directly to loading `workflow.md`.**

---

#### ✅ IF THE FILE EXISTS — proceed to STEP 2 below.

---

### STEP 2: PRESENT THE MENU

> ⚠️ **GUARD:** Only execute this step if STEP 1 confirmed the file EXISTS. If you took the "does not exist" path, you must NOT be here.


Use your `AskUserQuestion` tool to present these two options:

1. **Opción 1 — General Project Context:** Genera o actualiza `project-context.md` en `{output_folder}`. Aplica a todo el proyecto.
2. **Opción 2 — Feature-Specific Technical Preference:** Genera un `technical-preference.md` específico para un feature o épica. Requiere que ya exista un Project Context general.

---

### STEP 3: PROCESS SELECTION AND SET OUTPUT VARIABLES

#### IF THE USER CHOSE "General Project Context" (or was auto-routed):

1. Set in memory: `selected_mode = "general"`
2. Set in memory: `output_file = "{output_folder}/project-context.md"`
3. **Extension work is now COMPLETE.** Proceed to load `workflow.md`.

#### IF THE USER CHOSE "Feature-Specific Technical Preference":

1. **Ask for the feature name** using `AskUserQuestion`:
   > "¿Cuál es el nombre del feature para el que deseas crear el technical-preference? (ej: epic-02-auth-module, feature-mock-database). Usa formato kebab-case."
2. Receive the feature name from the user. Format it as kebab-case. Store as `feature_name`.
3. **Set paths (CRITICAL):**
   - Set in memory: `selected_mode = "feature-specific"`
   - Set in memory: `feature_name = [FEATURE_NAME]`
   - Set in memory: `output_file = "_bmad-output/shared-artifacts/[FEATURE_NAME]/technical-preference.md"`
4. **Create the directory:** Run `mkdir -p _bmad-output/shared-artifacts/[FEATURE_NAME]`
5. **Extension work is now COMPLETE.** Proceed to load `workflow.md`.

---

## IMPORTANT — HANDOFF NOTE:

Once STEP 3 is complete and all variables (`selected_mode`, `output_file`, `feature_name` if applicable) are set in memory, **this extension is done**. Do NOT re-execute this menu.

`workflow.md` will now be loaded as instructed by the entry point. It will load `step-01-discover.md` which reads these in-memory variables and adapts the discovery accordingly.

---

# ============================================================================
# SECTION 3: MANDATORY RULE — PHASE COMMIT AT WORKFLOW END
# ============================================================================

**TRIGGER:** Immediately after all workflow steps complete and the Project Context document has been generated/saved.

**CRITICAL INSTRUCTION:** As the final action of this workflow, you MUST invoke the `generate-commits-by-phase` skill to commit all changes for Phase 3.

### EXECUTION STEPS (PERFORM THESE ACTIONS AT THE END)

**STEP 1: INSPECT CHANGES**

Before committing, inspect the repository state:

1. Run `git status --short` to identify which files were created or modified.
2. Run `git diff --stat` to understand the scope of changes.

**STEP 2: GENERATE COMMIT MESSAGE**

Build a concise commit message using the format:
`[Phase 3 - Solutioning] <brief description of what was produced>`

**Example:** `[Phase 3 - Solutioning] add project context document for <project name>`

Write the message in the same language used throughout the conversation.

**STEP 3: INVOKE THE SKILL — COMMIT PHASE 3 CHANGES**

Run the skill `generate-commits-by-phase` with **Operation B: Commit All Changes** for **Phase 3 (solutioning)**:

```bash
node _siesa-agents/scripts/phases/phase3.js --commit "<generated commit message>"
```

**STEP 4: CONFIRM COMPLETION**

Output to the user:
> `✅ Project Context changes committed to Phase 3 (solutioning) branch.`

**This is the LAST action of the workflow. Do not execute any further steps after this commit.**
