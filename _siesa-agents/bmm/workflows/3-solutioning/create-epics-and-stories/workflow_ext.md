# ============================================================================
# MANDATORY RULE — PHASE BRANCH CREATION AT WORKFLOW START
# ============================================================================

**TRIGGER:** Immediately when the user initiates this workflow (e.g., `/create-epics-and-stories`).

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
> `✅ Phase 3 (solutioning) branch ready. Proceeding with Epics and Stories creation...`

**DO NOT proceed to the workflow steps until this rule is fully executed.**

---

# ============================================================================
# REGLA OBLIGATORIA: PRE-WORKFLOW DE EPICS (SHARDING-AWARE)
# ============================================================================

**TRIGGER (CUÁNDO APLICAR):**
Cada vez que el usuario solicite crear épicas, como `/create-epics-and-stories`.

**ACCIÓN RESTRICTIVA:**
⛔ PROHIBIDO ejecutar el workflow inmediatamente.

**PASO 1: INTERCEPTAR Y DESCUBRIR FEATURES**
Antes de iniciar el workflow estándar, debes obtener la lista de features del proyecto:
1. Buscar en `{planning_artifacts}/` archivos que coincidan con `feature-*.md` (PRD shardeado)
2. Si no existen shards, buscar en `{planning_artifacts}/prd.md` secciones como `### feature —` o `### feature -`
3. Si el `{planning_artifacts}/prd.md` NO contiene las secciones antes mencionadas, continua el flujo ESTANDAR `/create-epics-and-stories` sin alteraciones.

Presenta la lista de features descubiertos al usuario para confirmación:
> *"He detectado los siguientes features del PRD: [lista]. ¿Es correcta esta lista para organizar las épicas?"*

**PASO 2: INYECCIÓN DE CONTEXTO (HEADING STRUCTURE)**
Una vez confirmada la lista de features, inyectar las siguientes reglas de estructura que se aplican durante TODO el workflow (steps 2, 3 y 4):

### Reglas de estructura para el documento `epics.md`:

1. **Agrupación por Feature**: Cada feature confirmado será un heading `##` en el documento. Las épicas de ese feature van DENTRO como `###`. Las stories van como `####`.

2. **Jerarquía de headings obligatoria**:
   - `## {Feature Name}` — agrupa las épicas de un feature
   - `### Epic {N}: {Title}` — cada épica dentro del feature
   - `#### Story {N}.{M}: {Title}` — cada story dentro de la épica

   Nota: La generación del documento de epicas no se realiza por DOMINIO sino por FEATURE.

3. **Numeración de épicas GLOBAL y CONSECUTIVA**: La numeración de épicas NO se reinicia por feature. Es un consecutivo único a lo largo de todo el documento. Ejemplo:
   ```
   ## Measurement Units
   ### Epic 1: ...
   ### Epic 2: ...

   ## Cost Models
   ### Epic 3: ...    ← continúa desde 3, NO reinicia en 1
   ### Epic 4: ...

   ## Storages
   ### Epic 5: ...
   ```

4. **Secciones generales** (`## Overview`, `## Requirements Inventory`, etc.) permanecen igual que en el template estándar, al nivel `##`.

5. **Epic List en Step 2**: Al diseñar la epic list, organizar las épicas agrupadas por feature, manteniendo numeración global. Formato:

   ```
   ## Epic List

   ### {Feature Name 1}
   - Epic 1: [Title] — FRs: FR1, FR2
   - Epic 2: [Title] — FRs: FR3

   ### {Feature Name 2}
   - Epic 3: [Title] — FRs: FR4, FR5
   - Epic 4: [Title] — FRs: FR6
   ```

6. **Step 3 (Stories)**: Al generar épicas y stories, escribir cada feature como sección `##`, con sus épicas como `###` y stories como `####`. La numeración de stories sigue el patrón `{epic_num}.{story_num}` (ej: Story 3.1, Story 3.2 para Epic 3).

7. **Marcador `FEATURE_CODE_JIRA`**: Cada archivo shard de épica debe comenzar con la siguiente línea como **primera línea del archivo**, antes de cualquier heading:
   ```
   <!-- FEATURE_CODE_JIRA=PENDING:{slug} -->
   ```
   donde `{slug}` es el mismo slug kebab-case del feature correspondiente en el PRD shard (ej: `gestion-de-clientes`, `asociacion-cliente-contacto`). Este marcador es requerido por el workflow `sync-epics-stories` para asociar el shard con su issue en Jira.

**PASO 3: CONTINUAR CON WORKFLOW ESTÁNDAR**
Después de inyectar el contexto, continuar con el flujo normal del workflow `create-epics-and-stories` (step-01 → step-02 → step-03 → step-04), aplicando las reglas de estructura en cada paso.

---

# ============================================================================
# MANDATORY RULE — PHASE COMMIT AT WORKFLOW END
# ============================================================================

**TRIGGER:** Immediately after all workflow steps complete and the Epics and Stories document has been generated/saved.

**CRITICAL INSTRUCTION:** As the final action of this workflow, you MUST invoke the `generate-commits-by-phase` skill to commit all changes for Phase 3.

### EXECUTION STEPS (PERFORM THESE ACTIONS AT THE END)

**STEP 1: INSPECT CHANGES**

Before committing, inspect the repository state:

1. Run `git status --short` to identify which files were created or modified.
2. Run `git diff --stat` to understand the scope of changes.

**STEP 2: GENERATE COMMIT MESSAGE**

Build a concise commit message using the format:
`[Phase 3 - Solutioning] <brief description of what was produced>`

**Example:** `[Phase 3 - Solutioning] add epics and stories for <project name>`

Write the message in the same language used throughout the conversation.

**STEP 3: INVOKE THE SKILL — COMMIT PHASE 3 CHANGES**

Run the skill `generate-commits-by-phase` with **Operation B: Commit All Changes** for **Phase 3 (solutioning)**:

```bash
node _siesa-agents/scripts/phases/phase3.js --commit "<generated commit message>"
```

**STEP 4: CONFIRM COMPLETION**

Output to the user:
> `✅ Epics and Stories changes committed to Phase 3 (solutioning) branch.`

**This is the LAST action of the workflow. Do not execute any further steps after this commit.**
