---
workflowName: fast-track-dev
creationDate: 2026-03-16
module: bmm
status: COMPLETE
stepsCompleted: [1, 2, 3, 4, 6, 7, 8, 9]
---

# Workflow Creation Summary: fast-track-dev

## Workflow Information

- **Name:** fast-track-dev
- **Module:** bmm
- **Created:** 2026-03-16
- **Location:** `_siesa-agents/bmm/workflows/fast-track-dev/`
- **Python Executable:** `C:\Users\sebas\AppData\Local\Programs\Python\Python310\python.exe`
- **Script:** `C:\labs\siesaAgentsAlpha\_siesa-agents\scripts\bmad_orchestrator.py`

## Generated Files

| Archivo | Propósito |
|---|---|
| `workflow.md` | Archivo principal del workflow — configura nombre, rol y punto de entrada |
| `steps/step-01-init.md` | Validación de prerequisitos + detección y oferta de resume |
| `steps/step-02-configure.md` | Menú de opciones del script + construcción del comando + confirmación |
| `steps/step-03-execute.md` | Ejecución del script vía Bash + reporte de resultado |

## Quick Start Guide

### Instalación en módulo bmm

1. Copiar la carpeta `fast-track-dev/` a `_bmad/bmm/workflows/fast-track-dev/`
2. Actualizar `workflow_path` en los 3 step files apuntando a la nueva ubicación:
   ```
   workflow_path: '{project-root}/_bmad/bmm/workflows/fast-track-dev'
   ```
3. Registrar el workflow en el sistema de skills de BMAD

### Invocación

```
/bmad:bmm:workflows:fast-track-dev
```

### Flujo de ejecución típico

1. El workflow valida que `sprint-status.yaml` existe
2. Detecta si hay una ejecución anterior pausada (ofrece resume si aplica)
3. Presenta menú: procesar todo, por épica, por historia, dry-run, opciones avanzadas
4. Construye el comando Python y pide confirmación
5. Ejecuta el script — el orquestador toma el control
6. Reporta éxito o error con instrucciones de acción

## Scenarios de uso

| Escenario | Opción a elegir |
|---|---|
| Procesar todo el sprint | [1] Todas las historias pendientes |
| Procesar solo la épica 2 | [2] Por épica → `2` |
| Procesar solo la historia 3-1 | [3] Solo una historia → `3-1` |
| Ver qué se va a ejecutar sin correr | [5] Dry-run |
| Retomar una ejecución interrumpida | [R] Resume (aparece automáticamente) |
| Empezar desde el paso dev de la historia 2-3 | [4] + [6] Avanzadas |

## Known Issues / Post-Install Fixes

1. **workflow_path** — actualizar en los 3 step files tras instalar en ubicación final
2. **Sub-menú avanzado** — renombrar opción `[C]` a `[S]` en step-02 para evitar confusión con `[C]` de Confirmar

## Next Steps

1. Instalar en `_bmad/bmm/workflows/fast-track-dev/`
2. Actualizar `workflow_path` en los step files
3. Ejecutar compliance check: `/bmad:bmm:workflows:workflow-compliance-check`
4. Probar con un sprint activo (dry-run primero)
