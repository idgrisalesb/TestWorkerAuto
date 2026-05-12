---
name: 'step-01b-continue'
description: 'Handle workflow continuation from previous session for user guide generation'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/5-documentation/create-user-guide'

# File References
thisStepFile: '{workflow_path}/steps/step-01b-continue.md'
workflowFile: '{workflow_path}/workflow.md'
outputFileSpanish: '{output_folder}/documentation-artifacts/user-guide/es/{audience}-guide.md'

# Step files (for reading completed steps)
step02File: '{workflow_path}/steps/step-02-seleccion-features.md'
step03File: '{workflow_path}/steps/step-03-analisis-fuentes.md'
step04File: '{workflow_path}/steps/step-04-elicitacion.md'
step05File: '{workflow_path}/steps/step-05-generacion-espanol.md'
step06File: '{workflow_path}/steps/step-06-traduccion-ingles.md'
step07File: '{workflow_path}/steps/step-07-validacion-guardado.md'

# Task References
advancedElicitationTask: '{project-root}/_bmad/core/workflows/advanced-elicitation/workflow.xml'
partyModeWorkflow: '{project-root}/_bmad/core/workflows/party-mode/workflow.md'

# Config
bmmConfig: '{project-root}/_bmad/bmm/config.yaml'
---

# Step 1B: Continuación del Workflow

## STEP GOAL:

Reanudar el workflow de generación de guías de usuario desde donde se dejó, asegurando una continuación fluida sin pérdida de contexto o progreso. Analizar el estado actual, cargar el contexto previo y determinar el siguiente step a ejecutar.

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
- ✅ You bring documentation expertise, user brings project knowledge
- ✅ Maintain collaborative professional tone throughout

### Step-Specific Rules:

- 🎯 Focus ONLY on analyzing and resuming workflow state
- 🚫 FORBIDDEN to modify content completed in previous steps
- 💬 Maintain continuity with previous sessions
- 🚪 DETECT exact continuation point from frontmatter

## EXECUTION PROTOCOLS:

- 🎯 Show your analysis of current state before taking action
- 💾 Keep existing frontmatter `stepsCompleted` values intact
- 📖 Review content already generated in outputFile
- 🚫 FORBIDDEN to modify content completed in previous steps
- 📝 Update frontmatter.last_modified when resuming

## CONTEXT BOUNDARIES:

- Current user guide document (Spanish version) is already loaded
- Previous context = complete document + existing frontmatter
- Data collected in previous sessions (audience, epics, preferences)
- Last completed step = last value in `stepsCompleted` array

## CONTINUATION SEQUENCE:

### 1. Load Configuration

Load `{bmmConfig}` to resolve:
- `{project_name}`
- `{communication_language}`
- `{document_output_language}`

Communicate with user in `{communication_language}` (typically Spanish).

### 2. Analyze Current State

Read the complete Spanish output file at `{outputFileSpanish}` including frontmatter:

Extract from frontmatter:
- `stepsCompleted`: Array of completed step numbers (e.g., [1, 2, 3, 4])
- `currentStep`: Name of the last step (e.g., "step-04-elicitacion")
- `target_audience`: Audience selected (enduser/admin/api/mixed)
- `epics_selected`: Which epics were selected for documentation
- `technical_level`: Technical level chosen
- `include_troubleshooting`: Whether troubleshooting section is included
- `features_documented`: Count of features documented
- `workflows_documented`: Count of workflows documented
- `translation_completed`: Whether English version is done

The **last step completed** is the rightmost value in `stepsCompleted` array.

### 3. Read Completed Step Files

For each step number in `stepsCompleted` (excluding step 1):

**Example:** If `stepsCompleted: [1, 2, 3, 4]`:

Read these step files to understand what was accomplished:
- `{step02File}` - Epic selection
- `{step03File}` - Artifact analysis
- `{step04File}` - Information elicitation

The last completed step file will indicate the next step via `nextStepFile` reference.

### 4. Review Previous Output Content

Scan the Spanish output document to understand:
- Which sections have been generated (Introduction, Getting Started, Features, etc.)
- How many features are documented
- How many workflows are documented
- Presence of diagrams, screenshots, citations
- Current completeness status

### 5. Determine Next Step

Based on `stepsCompleted` array:

| Last Step | Next Step File | Next Step Description |
|-----------|----------------|------------------------|
| 1 | step-02-seleccion-features.md | Seleccionar features a documentar |
| 2 | step-03-analisis-fuentes.md | Analizar artefactos del proyecto |
| 3 | step-04-elicitacion.md | Elicitar información adicional |
| 4 | step-05-generacion-espanol.md | Generar contenido en español |
| 5 | step-06-traduccion-ingles.md | Traducir a inglés |
| 6 | step-07-validacion-guardado.md | Validar y guardar |

If step 7 is completed → workflow is fully finished (shouldn't reach here)

### 6. Welcome Back Dialog

Present context-aware welcome message:

"👋 **¡Bienvenido de vuelta!**

He detectado que tenemos un workflow de guía de usuario en progreso para **{project_name}**.

**Estado del Workflow:**
- Audiencia objetivo: **{target_audience_name}**
- Steps completados: **{count} de 7**
- Último step: **{last_step_description}**
- Features seleccionadas: **{features_selected_count}**
- Features documentadas: **{features_documented}** (si aplica)
- Estado: **{review_status}**

**Próximo Step:**
Estamos listos para continuar con: **{next_step_description}**

¿Todo sigue siendo válido o hay algo que necesitas ajustar antes de continuar?"

### 7. Validate Continuation Intent

Offer optional review:

"**Opciones de Revisión:**

**[S]** Resumen - Ver resumen detallado del progreso
**[M]** Modificar - Ajustar configuración o decisiones previas
**[C]** Continuar - Proceder directo al siguiente step

¿Qué deseas hacer?"

#### Menu Handling for Review Options:

- **IF S (Resumen):**
  - Display detailed summary:
    ```
    **Resumen Completo:**

    1. Configuración Inicial (step-01):
       - Audiencia: {target_audience}
       - Fecha inicio: {generated_date}

    2. Selección de Features (step-02):
       - Features incluidas: {features_selected}
       - Features excluidas: {features_excluded}

    3. Análisis de Fuentes (step-03):
       - PRDs encontrados: {prd_docs_count}
       - Features analizadas: {features_count}
       - Arquitectura: {architecture_docs_count}

    4. Elicitación (step-04):
       - Nivel técnico: {technical_level}
       - Troubleshooting: {include_troubleshooting}
       - Escenarios adicionales: {additional_scenarios}

    5-7. Generación/Traducción/Validación:
       - Features: {features_documented}
       - Workflows: {workflows_documented}
       - Diagramas: {diagrams_generated}
       - Screenshots: {screenshot_placeholders}
    ```
  - Return to menu

- **IF M (Modificar):**
  - "¿Qué deseas modificar?
    - [A] Audiencia objetivo
    - [E] Features seleccionadas
    - [P] Preferencias (nivel técnico, troubleshooting)
    - [X] Cancelar modificaciones"
  - Handle modifications (may require re-running some steps)
  - Return to menu

- **IF C (Continuar):**
  - Proceed to step 8

### 8. Update Continuation Metadata

Before loading next step:
- Update `frontmatter.last_modified` with current timestamp
- Keep `frontmatter.stepsCompleted` intact (don't modify)
- Optionally log continuation event

### 9. Present MENU OPTIONS

Display: **Select an Option:** [C] Continue to {next_step_name}

#### EXECUTION RULES:

- ALWAYS halt and wait for user input after presenting menu
- ONLY proceed to next step when user selects 'C'
- User can chat or ask questions - always respond and then redisplay menu

#### Menu Handling Logic:

- IF C: Update last_modified, then load, read entire file, then execute **{nextStepFile}**
- IF Any other: Respond and redisplay menu

## CRITICAL STEP COMPLETION NOTE

ONLY WHEN C is selected and continuation analysis is complete, will you then load, read entire file, then execute the determined next step file to resume the workflow.

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- Configuration loaded successfully
- Current state analyzed from frontmatter
- Completed steps reviewed
- Output content analyzed
- Next step determined correctly
- User welcomed with context
- Continuation metadata updated
- Ready to proceed to next step

### ❌ SYSTEM FAILURE:

- Not reading frontmatter correctly
- Incorrect determination of next step
- Modifying completed content
- Losing context from previous session
- Not updating continuation metadata
- Loading wrong next step

**Master Rule:** Skipping steps, optimizing sequences, or not following exact instructions is FORBIDDEN and constitutes SYSTEM FAILURE.
