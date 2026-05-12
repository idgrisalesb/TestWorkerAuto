---
stepsCompleted: [1, 2, 3, 4, 6, 7, 8, 9]
status: COMPLETE
---

# Workflow Creation Plan: fast-track-dev

## Initial Project Context

- **Module:** bmm
- **Target Location:** _siesa-agents/bmm/workflows/fast-track-dev
- **Created:** 2026-03-16
- **Problem Solved:** Automatizar el ciclo manual y secuencial de create-story → dev-story → code-review mediante ejecución de un script Python
- **Target Users:** Desarrolladores

---

## Requirements (Step 2)

### Workflow Type
- **Action Workflow** — ejecuta acciones (orquestación de herramientas/scripts), no genera documentos

### Workflow Purpose & Scope
- Servir de interfaz para invocar `bmad_orchestrator.py`, presentando al desarrollador todas las opciones disponibles del script
- Construir el comando correcto según la selección del usuario y ejecutarlo
- El script ya maneja la lógica de negocio (create-story → dev-story → code-review)

### Script Details
- **Ruta del script:** `C:\labs\siesaAgentsAlpha\_siesa-agents\scripts\bmad_orchestrator.py`
- **Comando de ejecución:** `C:\Users\sebas\AppData\Local\Programs\Python\Python310\python.exe C:\labs\siesaAgentsAlpha\_siesa-agents\scripts\bmad_orchestrator.py [opciones]`
- **Fuente de verdad:** `_bmad-output/implementation-artifacts/sprint-status.yaml`
- **Estado de resume:** `_siesa-agents/scripts/.orchestrator-state.json`
- **Logs:** `_siesa-agents/scripts/logs/`

### Opciones del Script a Exponer (todas)
| Flag | Descripción | Valor requerido |
|---|---|---|
| `--epic N` | Procesar todas las historias de un epic | Número de epic |
| `--only-story ID` | Procesar exclusivamente una historia | ID de historia (ej: 2-1) |
| `--story ID` | Empezar desde una historia específica | ID de historia (ej: 3-2) |
| `--step [create/dev/review]` | Empezar desde un paso específico (primera historia) | Paso a ejecutar |
| `--dry-run` | Mostrar el plan sin ejecutar | No requiere valor |
| `--model` | Elegir modelo de Claude | Nombre del modelo |
| *(sin flags)* | Procesar todas las historias pendientes | No requiere valor |

### Opción de Resume
- Al iniciar, el workflow debe detectar si existe `.orchestrator-state.json`
- Si existe, **ofrecer al desarrollador la opción de reanudar** desde donde quedó
- Si el desarrollador elige reanudar, ejecutar sin flags adicionales (el script retoma automáticamente)

### Validación de Prerrequisitos
- Verificar que `_bmad-output/implementation-artifacts/sprint-status.yaml` existe antes de ejecutar
- Si no existe, informar al desarrollador con mensaje claro y detener el workflow

### Flujo del Workflow
- **Lineal con branching** según la opción elegida por el desarrollador:
  1. Verificar prerrequisitos (sprint-status.yaml)
  2. Verificar estado previo (ofrecer resume si aplica)
  3. Presentar menú de opciones del script
  4. Solicitar el valor necesario según la opción elegida
  5. Construir y mostrar el comando que se va a ejecutar
  6. Confirmar con el desarrollador antes de ejecutar
  7. Ejecutar el script vía Bash
  8. Reportar resultado (éxito o error)

### Interaction Style
- **Prescriptivo** — menús claros, preguntas específicas, no conversacional
- Moderadamente autónomo: el desarrollador solo interactúa al inicio para configurar; el script corre solo después

### Outputs
- El script produce sus propios logs en `_siesa-agents/scripts/logs/`
- El workflow muestra en pantalla el output del script en tiempo real
- Al finalizar, confirma éxito (exit 0) o muestra el error y la instrucción de resume

### Success Criteria
- Sprint-status.yaml existe y tiene historias pendientes
- El desarrollador configura las opciones correctamente
- El script se ejecuta y termina con exit code 0
- El desarrollador sabe qué historias fueron procesadas

---

## Tools Configuration (Step 3)

### Core BMAD Tools
- **Party-Mode**: Excluido — workflow prescriptivo, no requiere debate multi-agente
- **Advanced Elicitation**: Excluido — flujo simple y directo
- **Brainstorming**: Excluido — no aplica para un workflow ejecutor

### LLM Features
- **Web-Browsing**: Excluido — no se necesita información externa
- **File I/O**: **Incluido** — para validar existencia de `sprint-status.yaml` y del state file `.orchestrator-state.json`
- **Sub-Agents**: Excluido — no se requiere delegación
- **Sub-Processes**: **Incluido** — para ejecutar el script Python vía Bash

### Memory Systems
- **Sidecar File**: Excluido — el script ya maneja su propio estado en `.orchestrator-state.json`

### External Integrations
- Ninguna requerida

### Installation Requirements
- Ninguna — todas las herramientas seleccionadas están disponibles sin instalación adicional

---

## Workflow Design (Step 6)

### Continuation Support
- **No requerido** — workflow de sesión única; el script maneja su propio estado

### Step Structure (3 pasos)

#### step-01-init.md
- Validar existencia de `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Si no existe → error claro y detener
- Detectar si `_siesa-agents/scripts/.orchestrator-state.json` existe
- Si existe → ofrecer opción de RESUME al desarrollador
  - Si elige resume → construir comando sin flags adicionales y saltar a step-03
- Auto-proceed a step-02

#### step-02-configure.md
- Presentar menú con todas las opciones del script:
  - [1] Procesar todas las historias pendientes (sin flags)
  - [2] Por épica: `--epic N`
  - [3] Solo una historia: `--only-story ID`
  - [4] Desde una historia específica: `--story ID`
  - [5] Solo ver el plan: `--dry-run`
  - [6] Opciones avanzadas: `--step [create/dev/review]` y/o `--model`
- Solicitar el valor necesario según la opción elegida
- Mostrar el comando completo construido
- Confirmar con el desarrollador → proceder a step-03

#### step-03-execute.md
- Ejecutar el script vía Bash con el comando construido
- Mostrar output en tiempo real
- Al finalizar:
  - Exit 0 → mensaje de éxito
  - Exit != 0 → mensaje de error + instrucción de resume (`python ... bmad_orchestrator.py`)
- FIN del workflow

### Decision Points / Branching
| Punto | Condición | Acción |
|---|---|---|
| step-01 | `.orchestrator-state.json` existe | Ofrecer resume → si acepta, skip step-02 directo a step-03 |
| step-02 | Opción 6 elegida | Sub-menú con `--step` y `--model` |
| step-03 | Exit code del script | Éxito vs error + instrucción de resume |

### AI Role & Persona
- **Rol:** Asistente técnico de orquestación BMAD
- **Tono:** Directo y claro — prescriptivo, sin conversación innecesaria
- **Estilo:** Menús numerados, preguntas específicas de valor único

### File Structure
```
fast-track-dev/
├── workflow.md
└── steps/
    ├── step-01-init.md
    ├── step-02-configure.md
    └── step-03-execute.md
```

---

## Build Summary (Step 7)

### Files Generated

| Archivo | Ruta | Estado |
|---|---|---|
| `workflow.md` | `_siesa-agents/bmm/workflows/fast-track-dev/workflow.md` | ✅ Creado |
| `step-01-init.md` | `_siesa-agents/bmm/workflows/fast-track-dev/steps/step-01-init.md` | ✅ Creado |
| `step-02-configure.md` | `_siesa-agents/bmm/workflows/fast-track-dev/steps/step-02-configure.md` | ✅ Creado |
| `step-03-execute.md` | `_siesa-agents/bmm/workflows/fast-track-dev/steps/step-03-execute.md` | ✅ Creado |

### Next Steps for Testing
1. Revisar los archivos generados en el paso de review (step-08)
2. Instalar el workflow en el módulo bmm
3. Registrar en el skill system con el comando `/bmad:bmm:workflows:fast-track-dev`
4. Probar con un sprint activo que tenga historias en estado `backlog`

---

## Review Findings (Step 8)

### Validation Results
- Estructura de archivos: ✅ PASSED
- Cumplimiento de templates: ✅ PASSED
- Consistencia entre archivos: ✅ PASSED
- Verificación de requerimientos: ✅ PASSED
- Buenas prácticas: ✅ PASSED

### Issues
- ⚠️ Warning: `workflow_path` en step files apunta a bmb-creations — debe actualizarse al instalar en ubicación final bmm
- ⚠️ Minor: conflicto visual de `[C]` en sub-menú avanzado de step-02 vs `[C]` de confirmación (pendiente fix)

### Approval Status: ✅ APROBADO — listo para instalación
