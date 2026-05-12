---
name: 'step-01-init'
description: 'Initialize the user guide generation workflow by detecting continuation state and configuring target audience'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/5-documentation/create-user-guide'

# File References
thisStepFile: '{workflow_path}/steps/step-01-init.md'
nextStepFile: '{workflow_path}/steps/step-02-seleccion-features.md'
workflowFile: '{workflow_path}/workflow.md'
featuresOutputFolder: '{output_folder}/documentation-artifacts/user-guide'
templateSpanish: '{workflow_path}/templates/user-guide-template-es.md'

# Output: ONE FILE PER FEATURE at {featuresOutputFolder}/{feature-slug}-guide.md
# State is kept in memory during the session (no state file)

# Data References
audienceTypesData: '{workflow_path}/data/audience-types.csv'

# Task References
advancedElicitationTask: '{project-root}/_bmad/core/workflows/advanced-elicitation/workflow.xml'
partyModeWorkflow: '{project-root}/_bmad/core/workflows/party-mode/workflow.md'

# Config
bmmConfig: '{project-root}/_bmad/bmm/config.yaml'
---

# Step 1: Inicialización del Workflow

## STEP GOAL:

Inicializar el workflow de generación de guías de usuario. Verificar qué features ya tienen documentación en `{featuresOutputFolder}/` para saber si es re-ejecución o nueva. El estado se mantiene en memoria durante la sesión.

**ARQUITECTURA DE OUTPUT:**
- Un archivo por feature: `{featuresOutputFolder}/{feature-slug}-guide.md`
- Si el archivo de la feature ya existe → se actualiza (action: update)
- Si no existe → se crea nuevo (action: create)
- Sin archivo de estado externo — todo en memoria

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:

- 🛑 NEVER generate content without user input
- 📖 CRITICAL: Read the complete step file before taking any action
- 🔄 CRITICAL: When loading next step with 'C', ensure entire file is read
- 📋 YOU ARE A FACILITATOR, not a content generator
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`

### Role Reinforcement:

- ✅ You are a technical writer and documentation specialist
- ✅ If you already have been given communication or persona patterns, continue to use those while playing this new role
- ✅ We engage in collaborative dialogue, not command-response
- ✅ You bring documentation expertise and structure, user brings project knowledge
- ✅ Maintain collaborative professional tone throughout

### Step-Specific Rules:

- 🎯 Focus ONLY on initialization and audience configuration
- 🚫 FORBIDDEN to look ahead to future steps
- 💬 Handle initialization professionally
- 🚪 DETECT existing workflow state and handle continuation properly

## EXECUTION PROTOCOLS:

- 🎯 Show analysis before taking any action
- 💾 Keep all state in memory (no external state file)
- 🚫 FORBIDDEN to load next step until setup is complete

## CONTEXT BOUNDARIES:

- Variables from workflow.md and config.yaml are available
- Previous context = what's in output document + frontmatter (if exists)
- Don't assume knowledge from other steps
- Input document discovery happens in step-03

## INITIALIZATION SEQUENCE:

### 1. Load Configuration

Load `{bmmConfig}` and resolve:
- `{project_name}`
- `{communication_language}`
- `{document_output_language}`
- `{planning_artifacts}`
- `{implementation_artifacts}`
- `{project_knowledge}`

Communicate with user in `{communication_language}` (typically Spanish).

### 2. Load Audience Types Data

Load and parse `{audienceTypesData}` to understand available audience types:
- enduser (Usuarios Finales / End Users)
- admin (Administradores / Administrators)
- api (Consumidores de API / API Consumers)
- mixed (Audiencia Mixta / Mixed Audience)

### 3. Check for Existing Feature Docs

Scan `{featuresOutputFolder}/` for files matching `*-guide.md`.

For each file found, read its frontmatter to extract: `feature_id`, `feature_slug`, `generated_date`, `review_status`.

Build a lookup map in memory: `{ "gestion-de-clientes": { generated_date, review_status }, ... }`

- If any files found → existing documentation detected (step 5)
- If no files found → fresh workflow (step 6)

This map will be used in step-02 to identify which features are **new** vs **update**.

### 5. Handle Existing Documentation

**If any `*-guide.md` files exist in `{featuresOutputFolder}`:**

List the existing feature docs found in step 3.

"✅ **Documentación Existente Encontrada**

Ya existe documentación generada para las siguientes features:
{for each existing feature doc}
- **{feature_id}** — {feature_slug}-guide.md (generada: {generated_date}, estado: {review_status})
{end for}

¿Qué deseas hacer?

**[N]** Nueva ejecución - Seleccionar features adicionales o regenerar
**[U]** Update - Actualizar features existentes (re-ejecutar workflow)
**[X]** Cancel - Cancelar workflow

Por favor selecciona una opción:"

**Menu Handling:**
- IF N: Continue with fresh run (step 6) — existing feature files are preserved unless re-selected
- IF U: Continue with fresh run (step 6) — step-02 will mark existing features as action: update
- IF X: HALT workflow and inform user

### 6. Fresh Workflow Setup (If No Guides or User Selected New)

"👋 **Bienvenido al Generador de Guías de Usuario**

Este workflow te ayudará a crear guías de usuario comprehensivas en español desde las features del proyecto (archivos PRD + épicas individuales por feature).

**Características:**
- 📄 Guía en español, archivo único actualizable por feature
- 📊 Diagramas Mermaid para features y workflows
- 📸 Screenshot placeholders con índice consolidado
- 🔗 Trazabilidad completa a fuentes (features, stories)
- ✅ Validación de completitud y calidad

Comencemos configurando la guía de usuario..."

#### A. Determine Target Audience

<!-- AUDIENCE SELECTION DISABLED: always use enduser by default. Do NOT show audience menu to user. -->

Auto-select without asking:
- audience_id = "enduser"
- filename_prefix = "enduser-guide"

<!-- Available options (kept for reference, not shown):
- E → enduser / enduser-guide
- A → admin / admin-guide
- I → api / api-guide
- M → mixed / complete-guide
-->

Store selected audience information from CSV data.

#### B. Confirmation Message

"✅ **Configuración Inicial Completada**

- Audiencia objetivo: **{audience_name_es}**
- Idioma: Español
- Arquitectura: Un archivo por feature en `{output_folder}/documentation-artifacts/user-guide/`
- Estado del workflow: `_workflow-state.md`

Continuando a la selección de features..."

### 7. Proceed Automatically

- Load, read entire file, then execute `{nextStepFile}` immediately (no menu, no pause)

## CRITICAL STEP COMPLETION NOTE

NO MENU in this step. Proceed automatically to `{nextStepFile}`.

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- Configuration loaded from config.yaml
- Audience types loaded from CSV
- `{featuresOutputFolder}` scanned for existing `*-guide.md` files
- Existing docs detected → [N]/[U]/[X] menu shown, or fresh run started
- User welcomed and audience auto-selected (enduser)
- Feature doc lookup map built in memory
- Ready to proceed to step 2

### ❌ SYSTEM FAILURE:

- Not scanning for existing feature docs in `{featuresOutputFolder}`
- Creating a single monolithic output file (forbidden — must be per-feature)
- Creating `_workflow-state.md` (forbidden — no state file)
- Missing audience configuration
- Proceeding without user confirmation when docs already exist

**Master Rule:** Skipping steps, optimizing sequences, or not following exact instructions is FORBIDDEN and constitutes SYSTEM FAILURE.
