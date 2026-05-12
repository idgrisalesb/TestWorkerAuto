---
name: 'step-02-configure'
description: 'Present all orchestrator options to the developer, collect values, build and confirm the execution command'

# Path Definitions
workflow_path: '{project-root}/_siesa-agents/bmm/workflows/fast-track-dev'

# File References
thisStepFile: '{workflow_path}/steps/step-02-configure.md'
nextStepFile: '{workflow_path}/steps/step-03-execute.md'
workflowFile: '{workflow_path}/workflow.md'

# Script execution
pythonExe: 'python'
scriptPath: '{project-root}/_siesa-agents/scripts/bmad_orchestrator.py'

# Template References

# Task References
advancedElicitationTask: '{project-root}/_bmad/core/workflows/advanced-elicitation/workflow.xml'
partyModeWorkflow: '{project-root}/_bmad/core/workflows/party-mode/workflow.md'
---

# Step 2: Configure Execution

## STEP GOAL:

Presentar al desarrollador todas las opciones disponibles del orquestador, recolectar los valores necesarios según la opción elegida, construir el comando final y obtener confirmación antes de ejecutar.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:

- 🛑 NEVER generate content without user input
- 📖 CRITICAL: Read the complete step file before taking any action
- 🔄 CRITICAL: When loading next step with 'C', ensure entire file is read
- 📋 YOU ARE A FACILITATOR, not a content generator
- ✅ YOU MUST ALWAYS SPEAK OUTPUT in `{communication_language}`

### Role Reinforcement:

- ✅ Eres un asistente técnico de orquestación BMAD
- ✅ Tono prescriptivo: menús claros, una pregunta a la vez
- ✅ Mostrar siempre el comando construido antes de ejecutar
- ✅ El desarrollador tiene la última palabra antes de ejecutar

### Step-Specific Rules:

- 🎯 Enfócate SOLO en configurar las opciones y construir el comando
- 🚫 PROHIBIDO ejecutar el script en este paso
- 💬 Una pregunta a la vez — no abrumar al desarrollador con múltiples inputs simultáneos
- 🚫 PROHIBIDO continuar a step-03 sin confirmación explícita del desarrollador

## EXECUTION PROTOCOLS:

- 🎯 Presentar menú principal y esperar selección
- 💾 Construir el comando progresivamente según los valores recibidos
- 📖 Mostrar el comando final completo antes de solicitar confirmación
- 🚫 PROHIBIDO omitir el paso de confirmación

## CONTEXT BOUNDARIES:

- sprint-status.yaml ya fue validado en step-01
- No hay estado previo de resume (ese path va directo a step-03)
- Este paso construye el comando completo que usará step-03

---

## Sequence of Instructions (Do not deviate, skip, or optimize)

### 1. Present Main Options Menu

Mostrar:

```
🚀 BMAD Story Orchestrator — Configuración

¿Qué deseas ejecutar?

  [1] Todas las historias pendientes      (sin flags)
  [2] Las historias de una épica          (--epic N)
  [3] Solo una historia específica        (--only-story ID)
  [4] Desde una historia específica       (--story ID)
  [5] Solo ver el plan sin ejecutar       (--dry-run)
  [6] Opciones avanzadas                  (--step / --model)
```

Esperar selección del desarrollador.

### 2. Collect Required Value

Según la opción elegida, solicitar el valor necesario:

**Si [1]:** No se necesita valor. Ir directamente al paso 3 con comando base.

**Si [2]:**
```
¿Cuál es el número de la épica? (ej: 1, 2, 3)
>
```
Guardar valor como `--epic {valor}`.

**Si [3]:**
```
¿Cuál es el ID de la historia? (ej: 2-1, 3-4)
>
```
Guardar valor como `--only-story {valor}`.

**Si [4]:**
```
¿Desde qué historia deseas empezar? (ej: 3-2)
>
```
Guardar valor como `--story {valor}`.

**Si [5]:** No se necesita valor. Agregar `--dry-run` al comando.

**Si [6]:** Mostrar sub-menú de opciones avanzadas:
```
Opciones avanzadas disponibles:

  [A] Empezar desde un paso específico    (--step)
  [B] Usar un modelo de Claude específico (--model)
  [C] Combinar ambas opciones             (--step + --model)
```
- Si [A]: Preguntar `¿Desde qué paso? [create / dev / review]` → guardar `--step {valor}`
- Si [B]: Preguntar `¿Qué modelo usar? (ej: claude-opus-4-6, claude-sonnet-4-6)` → guardar `--model {valor}`
- Si [C]: Preguntar primero por el paso, luego por el modelo → guardar ambos flags
- Estas opciones avanzadas se pueden combinar con las opciones [2], [3] o [4] si el desarrollador lo indica. Preguntar: `¿También deseas filtrar por épica o historia específica?`

### 3. Build and Display Final Command

Construir el comando completo concatenando:
```
{pythonExe} {scriptPath} [flags recolectados]
```

Mostrar al desarrollador:
```
📋 Comando a ejecutar:

   python
   C:/.../bmad_orchestrator.py [flags]

¿Confirmas la ejecución?

  [C] Confirmar y ejecutar
  [M] Modificar opciones (volver al menú principal)
```

#### EXECUTION RULES

- SIEMPRE mostrar el comando completo antes de pedir confirmación
- SIEMPRE esperar confirmación explícita
- Si elige [M]: volver al paso 1 (menú principal)

#### Menu Handling Logic

- **IF C:** Almacenar el comando construido en contexto, luego cargar, leer completo y ejecutar `{nextStepFile}`
- **IF M:** Volver al paso 1 (menú principal) para reconfigurar
- **IF cualquier otra entrada:** Mostrar de nuevo la confirmación

---

## CRITICAL STEP COMPLETION NOTE

ONLY WHEN [C confirm option] is selected AND the full execution command has been built, displayed to the developer, and explicitly confirmed, will you then load and read fully `{nextStepFile}` to execute and begin orchestrator execution.

Do NOT proceed to `{nextStepFile}` if:
- The command has not been shown to the developer
- The developer selected [M] to modify — return to main menu instead
- No explicit [C] confirmation was received

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- Menú principal presentado y opción elegida
- Valor requerido recolectado correctamente según la opción
- Comando final construido y mostrado completo al desarrollador
- Desarrollador confirmó explícitamente con [C]
- Routing correcto a step-03 con el comando en contexto

### ❌ SYSTEM FAILURE:

- Ejecutar el script en este paso
- Continuar sin confirmación del desarrollador
- No mostrar el comando completo antes de confirmar
- Hacer múltiples preguntas en simultáneo
- Omitir opciones disponibles del script

**Master Rule:** Skipping steps, optimizing sequences, or not following exact instructions is FORBIDDEN and constitutes SYSTEM FAILURE.
