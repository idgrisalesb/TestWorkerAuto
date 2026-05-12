---
name: 'step-03-execute'
description: 'Execute the BMAD orchestrator script and report the result to the developer'

# Path Definitions
workflow_path: '{project-root}/_siesa-agents/bmm/workflows/fast-track-dev'

# File References
thisStepFile: '{workflow_path}/steps/step-03-execute.md'
workflowFile: '{workflow_path}/workflow.md'

# Script execution
pythonExe: 'python'
scriptPath: '{project-root}/_siesa-agents/scripts/bmad_orchestrator.py'

# Template References

# Task References
advancedElicitationTask: '{project-root}/_bmad/core/workflows/advanced-elicitation/workflow.xml'
partyModeWorkflow: '{project-root}/_bmad/core/workflows/party-mode/workflow.md'
---

# Step 3: Execute Orchestrator

## STEP GOAL:

Ejecutar el script bmad_orchestrator.py con el comando configurado (ya sea por step-02 o por una selección de resume en step-01), mostrar el output en tiempo real y reportar claramente el resultado final al desarrollador.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:

- 🛑 NEVER generate content without user input
- 📖 CRITICAL: Read the complete step file before taking any action
- 🔄 CRITICAL: When loading next step with 'C', ensure entire file is read
- 📋 YOU ARE A FACILITATOR, not a content generator
- ✅ YOU MUST ALWAYS SPEAK OUTPUT in `{communication_language}`

### Role Reinforcement:

- ✅ Eres un asistente técnico de orquestación BMAD
- ✅ En este paso tu rol es ejecutar y reportar — mínima intervención
- ✅ El script maneja su propia lógica; no interferir ni interpretar su output
- ✅ Reportar el resultado final de forma clara y accionable

### Step-Specific Rules:

- 🎯 Ejecutar el comando exactamente como fue construido o como fue indicado (resume)
- 🚫 PROHIBIDO modificar el comando antes de ejecutar
- 💬 Después de ejecutar, reportar claramente éxito o error
- 🚫 PROHIBIDO reintentar automáticamente — el script maneja sus propios reintentos

## EXECUTION PROTOCOLS:

- 🎯 Determinar el modo de ejecución: resume (sin flags) o comando configurado
- 💻 Ejecutar vía Bash con el comando completo
- 📊 Capturar exit code para determinar éxito o error
- 🚫 PROHIBIDO modificar el script o sus argumentos

## CONTEXT BOUNDARIES:

- Si se viene desde step-01 con resume=true: ejecutar sin flags adicionales
- Si se viene desde step-02: usar el comando que fue construido y confirmado
- El script produce sus propios logs en `_siesa-agents/scripts/logs/`

---

## Sequence of Instructions (Do not deviate, skip, or optimize)

### 1. Determine Execution Mode

**Si el desarrollador eligió RESUME en step-01:**

Comando a ejecutar:
```
python {scriptPath} --yes
```
(sin flags adicionales — el script retoma desde el state file automáticamente; `--yes` omite la confirmación interactiva)

**Si el desarrollador configuró opciones en step-02:**

Usar el comando completo construido y confirmado en step-02, añadiendo `--yes` al final.

### 2. Display Pre-Execution Notice

Mostrar antes de ejecutar:
```
⚡ Iniciando orquestador BMAD...
   El script tomará control del proceso desde aquí.
   Puedes interrumpir con Ctrl+C en cualquier momento — el estado quedará guardado.
```

### 3. Execute Script

Ejecutar el comando via Bash (sin piping de stdin — el flag --yes elimina la necesidad de confirmación interactiva).

El script maneja internamente:
- Parsing de sprint-status.yaml
- Presentación del plan de ejecución
- Confirmación Enter del desarrollador
- Ejecución de cada paso (create → dev → review)
- Reintentos por rate limit
- Guardado de estado en caso de interrupción

### 4. Report Result

Una vez que el script termine, evaluar el exit code:

**Si exit code = 0 (éxito):**
```
✅ Orquestador completado exitosamente.

   Todas las historias del plan fueron procesadas.
   Los logs detallados están en: _siesa-agents/scripts/logs/

Workflow fast-track-dev finalizado.
```

**Si exit code ≠ 0 (error o interrupción):**
```
⚠️  El orquestador se detuvo antes de completar.

   El estado fue guardado automáticamente.
   Para reanudar desde donde quedó, ejecuta nuevamente este workflow
   y selecciona la opción [R] Reanudar.

   Los logs del error están en: _siesa-agents/scripts/logs/

Workflow fast-track-dev detenido.
```

---

## CRITICAL STEP COMPLETION NOTE

This is the final step of the fast-track-dev workflow. There is no next step to load.

The workflow is complete ONLY WHEN:
- The orchestrator script has finished execution (exit code received)
- The result has been clearly reported to the developer:
  - exit code 0 → success message shown
  - exit code ≠ 0 → error message AND resume instructions shown

Do NOT consider the workflow complete if:
- The script is still running
- The exit code was not evaluated
- The result message was not displayed to the developer

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- Script ejecutado con el comando correcto (sin modificaciones)
- Output del script visible durante la ejecución
- Exit code capturado y evaluado correctamente
- Mensaje de resultado presentado claramente al desarrollador
- Instrucción de resume mostrada en caso de error

### ❌ SYSTEM FAILURE:

- Modificar el comando antes de ejecutar
- Reintentar automáticamente sin que el desarrollador lo solicite
- No reportar el resultado final
- No mostrar instrucción de resume cuando el script falla
- Interferir con el output interno del script

**Master Rule:** Skipping steps, optimizing sequences, or not following exact instructions is FORBIDDEN and constitutes SYSTEM FAILURE.
