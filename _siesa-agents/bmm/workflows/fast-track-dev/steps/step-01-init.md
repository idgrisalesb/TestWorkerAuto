---
name: 'step-01-init'
description: 'Validate prerequisites and detect existing orchestrator state before execution'

# Path Definitions
workflow_path: '{project-root}/_siesa-agents/bmm/workflows/fast-track-dev'

# File References
thisStepFile: '{workflow_path}/steps/step-01-init.md'
nextStepFile: '{workflow_path}/steps/step-02-configure.md'
executeStepFile: '{workflow_path}/steps/step-03-execute.md'
workflowFile: '{workflow_path}/workflow.md'

# Key paths
sprintStatusFile: '{project-root}/_bmad-output/implementation-artifacts/sprint-status.yaml'
stateFile: '{project-root}/_siesa-agents/scripts/.orchestrator-state.json'

# Template References

# Task References
advancedElicitationTask: '{project-root}/_bmad/core/workflows/advanced-elicitation/workflow.xml'
partyModeWorkflow: '{project-root}/_bmad/core/workflows/party-mode/workflow.md'
---

# Step 1: Initialization & Prerequisites

## STEP GOAL:

Validar que los prerrequisitos están en orden y detectar si existe una ejecución anterior pausada, ofreciendo al desarrollador la opción de reanudar antes de configurar una nueva ejecución.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:

- 🛑 NEVER generate content without user input
- 📖 CRITICAL: Read the complete step file before taking any action
- 🔄 CRITICAL: When loading next step with 'C', ensure entire file is read
- 📋 YOU ARE A FACILITATOR, not a content generator
- ✅ YOU MUST ALWAYS SPEAK OUTPUT in `{communication_language}`

### Role Reinforcement:

- ✅ Eres un asistente técnico de orquestación BMAD
- ✅ El tono es directo y eficiente — el desarrollador quiere ejecutar, no conversar
- ✅ Reporta claramente el estado de los prerrequisitos
- ✅ Si hay un estado previo, preséntalo con información clara antes de preguntar

### Step-Specific Rules:

- 🎯 Enfócate SOLO en validación y detección de estado
- 🚫 PROHIBIDO iniciar configuración de opciones en este paso
- 💾 Si el desarrollador elige RESUME, salta directamente a step-03 con flag de resume
- 🚫 Si sprint-status.yaml no existe, DETENER inmediatamente con mensaje claro

## EXECUTION PROTOCOLS:

- 🎯 Validar prerrequisitos antes de cualquier otra acción
- 📖 Usar File I/O para verificar existencia de archivos
- 🚫 PROHIBIDO continuar si sprint-status.yaml no existe

## CONTEXT BOUNDARIES:

- Config de bmm disponible en memoria
- No asumir estado de ejecuciones anteriores sin verificar el state file
- Este paso es solo validación y routing — no configuración

---

## Sequence of Instructions (Do not deviate, skip, or optimize)

### 1. Validate Prerequisites

Usar File I/O para verificar que `{sprintStatusFile}` existe.

**Si NO existe:**

Mostrar:
```
❌ No se encontró el archivo de sprint:
   _bmad-output/implementation-artifacts/sprint-status.yaml

Este archivo es la fuente de verdad del orquestador.
Asegúrate de haber ejecutado el sprint-planning workflow antes de continuar.

Workflow detenido.
```

Detener el workflow completamente. No cargar ningún otro paso.

**Si SÍ existe:** continuar al paso 2.

### 2. Detect Resume State

Verificar si existe `{stateFile}`.

**Si NO existe:** Proceder directamente sin mostrar nada → cargar, leer completo y ejecutar `{nextStepFile}`.

**Si SÍ existe:** Leer el contenido del state file para mostrar información del estado previo, luego ir al paso 3.

### 3. Present Resume Option

Mostrar al desarrollador el estado previo encontrado:

```
⚠️  Se encontró una ejecución anterior pausada:

   Historia: [story_id del state file]
   Paso:     [step del state file]
   Estado:   [completed: true/false del state file]
   Fecha:    [timestamp del state file]

¿Qué deseas hacer?
```

Mostrar menú:

**[R]** Reanudar desde donde quedó (el script retomará automáticamente)
**[N]** Iniciar nueva configuración (ignorar estado anterior)

#### EXECUTION RULES

- SIEMPRE detener y esperar selección del usuario
- NO asumir qué quiere el desarrollador

#### Menu Handling Logic

- **IF R:** Cargar, leer completo y ejecutar `{executeStepFile}` con flag `resume=true` en contexto — el desarrollador eligió reanudar sin flags adicionales
- **IF N:** Cargar, leer completo y ejecutar `{nextStepFile}` — el desarrollador quiere configurar una nueva ejecución
- **IF cualquier otra entrada:** Mostrar de nuevo el menú

---

## CRITICAL STEP COMPLETION NOTE

ONLY WHEN prerequisites are fully validated will the correct routing occur:

- IF `{sprintStatusFile}` does NOT exist: stop completely — do NOT load any next step
- IF `{sprintStatusFile}` exists AND `{stateFile}` does NOT exist: immediately load, read fully, and execute `{nextStepFile}`
- IF `{sprintStatusFile}` exists AND `{stateFile}` exists: halt and wait for developer selection — ONLY THEN load, read fully, and execute:
  - IF [R] selected: `{executeStepFile}`
  - IF [N] selected: `{nextStepFile}`

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- sprint-status.yaml verificado como existente
- State file verificado (existe o no)
- Si existe state file: información presentada y opción elegida por el desarrollador
- Routing correcto al siguiente paso

### ❌ SYSTEM FAILURE:

- Continuar sin verificar sprint-status.yaml
- No mostrar la opción de resume cuando el state file existe
- Leer el state file sin mostrar la información al desarrollador
- Cargar step-02 cuando el desarrollador eligió resume

**Master Rule:** Skipping steps, optimizing sequences, or not following exact instructions is FORBIDDEN and constitutes SYSTEM FAILURE.
