---
name: 'step-02-seleccion-features'
description: 'Load features from feature-status.yaml and select which to include in the user guide'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/5-documentation/create-user-guide'

# File References
thisStepFile: '{workflow_path}/steps/step-02-seleccion-features.md'
nextStepFile: '{workflow_path}/steps/step-03-analisis-fuentes.md'
workflowFile: '{workflow_path}/workflow.md'
featuresOutputFolder: '{output_folder}/documentation-artifacts/user-guide'

# Data Locations
featureStatusYaml: '{implementation_artifacts}/feature-status.yaml'
epicsFolder: '{planning_artifacts}/epics'

# Config
bmmConfig: '{project-root}/_bmad/bmm/config.yaml'
---

# Step 2: Selección de Features

## STEP GOAL:

Leer el archivo `{implementation_artifacts}/feature-status.yaml` para cargar todas las features disponibles del proyecto, presentarlas al usuario y registrar cuáles documentar. Para cada feature seleccionada, verificar si existe un archivo de épica correspondiente en `{planning_artifacts}/epics/`.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:

- 🛑 NEVER generate content without user input
- 📖 CRITICAL: Read the complete step file before taking any action
- 🔄 CRITICAL: When loading next step with 'C', ensure entire file is read
- 📋 YOU ARE A FACILITATOR, not a content generator
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`

### Step-Specific Rules:

- 🎯 Focus ONLY on feature discovery and selection
- 🚫 FORBIDDEN to read feature file content in this step (that happens in step-03)
- 💬 Presenta la lista clara y espera la selección del usuario
- 🚫 DO NOT make assumptions about which features to include

## EXECUTION PROTOCOLS:

- 🎯 Read `{featureStatusYaml}` as the single source of truth for feature discovery
- 💾 Keep feature selection in memory (no state file)
- 🚫 FORBIDDEN to proceed without user confirmation

## EXECUTION SEQUENCE:

### 1. Load Feature Status YAML

Read `{featureStatusYaml}` and parse all feature entries.

Expected YAML structure:
```yaml
features:
  - id: "F1"
    slug: "feature-slug"
    title: "Feature Title"
    status: "backlog"         # backlog | in-progress | done | completed | blocked
    epic_file: "epics/epic-01-feature-slug.md"   # optional, null if not assigned
    last_update: "DD-MM-YYYY"
```

For each entry extract: `id`, `slug`, `title`, `status`, `epic_file`, `last_update`.

If the file does not exist, **HALT** and notify the user:
> "⚠️ No se encontró `{featureStatusYaml}`. Este archivo es requerido para continuar. Genera el archivo ejecutando el workflow `sprint-planning` primero."

### 2. Sort and Index Features

Sort entries by feature number (F1, F2, ... Fn).

Build a lookup map: `{ "F1": { slug, title, status, epic_file, last_update }, ... }`

### 3. Check for Corresponding Epic Files

For each feature loaded, if `epic_file` is null or not present in the YAML, check if `{epicsFolder}/epic-*-{slug}.md` exists on disk.
Mark each feature: `has_epic: true/false`.

### 3b. Check for Existing Feature Doc Files

For each feature discovered, check if `{featuresOutputFolder}/{slug}-guide.md` already exists.
Mark each feature: `doc_exists: true/false`.

If `doc_exists: true`, read the file's frontmatter to get: `generated_date`, `review_status`.

This determines the `action` per feature:
- `doc_exists: false` → `action: "create"` (nuevo documento)
- `doc_exists: true` → `action: "update"` (actualizar documento existente)

### 4. Present Features to User

Cross-reference each discovered feature with the status lookup map from step 1.

Map status values to display labels:
- `backlog` → `⬜ Backlog`
- `in-progress` → `🔄 En Progreso`
- `done` / `completed` → `✅ Completada`
- `blocked` → `🚫 Bloqueada`
- not found in status file → `— Sin estado`

Display in `{communication_language}`:

"📦 **Features del Proyecto**

| ID | Feature | Estado | Épica | Documentación |
|----|---------|--------|-------|---------------|
{for each feature sorted by ID}
| **{id}** | {title} | {status_label} | {if has_epic: '✅' else: '📄 PRD'} | {if doc_exists: '🔄 Actualizar (generada: {generated_date})' else: '🆕 Nueva'} |
{end for}

**Total:** {count} features | **Con épica:** {epic_count} | **Solo PRD:** {prd_only_count}
**Documentación:** {new_count} nuevas | {update_count} a actualizar

> ✅ épica = tiene historias y acceptance criteria | 🆕 = se creará nuevo archivo | 🔄 = se actualizará archivo existente"

### 5. Request Feature Selection

Ask user:

"¿Cuáles features deseas documentar?

Indica los IDs separados por comas (ej: F1,F3,F5) o escribe **A** para incluirlas todas."

HALT and wait for user input.

### 6. Parse User Response

**IF A (All features):**
- Set `features_selected` = [all feature IDs found]
- Set `features_excluded` = []
- Message: "✅ Incluidas: {count} features (todas)"

**IF comma-separated IDs:**
- Parse IDs (accept both `F1,F3` and `1,3`)
- Validate each ID exists in discovered features; warn if any ID is not found
- Set `features_selected` = [parsed IDs]
- Set `features_excluded` = [remaining IDs]
- Message: "✅ Incluidas: {selected_count} features | Excluidas: {excluded_count}"

### 7. Confirmation Message

"✅ **Selección de Features Completada**

Documentaremos las siguientes features:
{for each selected feature}
- **{id}** — {title} {if has_epic: '(con épica)' else: '(solo PRD)'} → {if action == 'create': '🆕 Crear `{slug}-guide.md`' else: '🔄 Actualizar `{slug}-guide.md`'}
{end for}

Excluidas: {excluded_count} features

Procediendo al análisis de documentación..."

### 8. Present MENU OPTIONS

Display: **Select an Option:** [R] Refresh [C] Continue

#### Menu Handling Logic:

- IF R: Re-scan `{featureStatusYaml}` and return to step 1
- IF C: Load, read entire file, then execute `{nextStepFile}`
- IF Any other: Respond and redisplay menu

## CRITICAL STEP COMPLETION NOTE

ONLY WHEN C is selected will you load, read entire file, then execute `{nextStepFile}` to begin artifact analysis.

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- `{featureStatusYaml}` leído y parseado correctamente
- Features listadas con IDs, títulos y estados desde el YAML
- Epic file existence checked for each feature
- Existing feature doc files checked → `action: create/update` assigned per feature
- User provided clear selection
- Selection kept in memory with id, slug, title, prd_file, epic_file, has_epic, action, output_file per feature
- Ready to proceed to step 3

### ❌ SYSTEM FAILURE:

- No leer `{featureStatusYaml}` como fuente principal de features
- Escanear PRD files en lugar de leer el YAML
- Not checking `{featuresOutputFolder}` for existing `{slug}-guide.md` files
- Not assigning `action: create/update` per feature
- Writing a `_workflow-state.md` file (forbidden — no state file)
- Reading feature file content (reserved for step-03)
- Making assumptions about which features to include
- Proceeding without user confirmation

**Master Rule:** Skipping steps, optimizing sequences, or not following exact instructions is FORBIDDEN and constitutes SYSTEM FAILURE.
