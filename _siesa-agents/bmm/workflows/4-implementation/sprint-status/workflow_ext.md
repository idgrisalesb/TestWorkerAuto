# REGLA OBLIGATORIA: MENÚ DE INICIO

**TRIGGER:** Al inicio del modo `interactive`, **antes del Step 1**.

Invocar `AskUserQuestion` con la siguiente configuración:

```json
{
  "questions": [
    {
      "question": "¿Qué deseas ejecutar?",
      "header": "Modo",
      "multiSelect": false,
      "options": [
        {
          "label": "Sprint Status + Retrospective",
          "description": "Ejecuta el resumen del sprint y encadena automáticamente con el workflow de Retrospective al finalizar."
        },
        {
          "label": "Solo Sprint Status",
          "description": "Ejecuta únicamente el resumen del sprint sin encadenar con Retrospective."
        }
      ]
    }
  ]
}
```

- Si elige `Sprint Status + Retrospective`: guardar `run_retrospective = true`
- Si elige `Solo Sprint Status`: guardar `run_retrospective = false`

**Al finalizar el Step 5** (después de que el usuario elija su acción), si `run_retrospective == true`:

```
---
➡️ Encadenando con Retrospective tal como seleccionaste al inicio...
```

Luego invocar `/bmad:bmm:workflows:retrospective`.

---

# REGLA OBLIGATORIA: SPRINT-STATUS CON SINCRONIZACIÓN DE FEATURE-STATUS

**TRIGGER:** Cada vez que se ejecute `/sprint-status`.

---

## 1. AUTO-COMPLETAR ÉPICAS Y DETECCIÓN DE ÉPICAS COMPLETADAS

Después de ejecutar el **Step 2** del `instructions.md` (parse de `sprint-status.yaml`), ejecutar dos acciones en orden:

### 1.1 Auto-completar épicas cuyas stories están todas en done

Antes de cualquier otra lógica, verificar si alguna épica tiene status distinto de `done` pero **todas sus stories sí están en `done`**. Si es así, avanzar automáticamente la épica a `done` en `sprint-status.yaml`.

```
FUNCTION auto_complete_epics():
  epics_advanced = []

  FOR each epic_key IN development_status:
    IF epic_key MATCHES "epic-{N}" (not source, not retrospective):
      IF development_status[epic_key] != "done":
        stories = [key for key in development_status
                   if key STARTS WITH "{N}-"
                   AND NOT key ends with "-source"
                   AND NOT key ends with "-retrospective"]

        IF stories IS NOT EMPTY AND ALL stories have status "done":
          development_status[epic_key] = "done"
          epics_advanced.APPEND(N)

  IF epics_advanced IS NOT EMPTY:
    Guardar sprint-status.yaml con los cambios
    Reportar en Step 4:
      "**Épicas auto-completadas:** epic-{N} → done (todas las stories en done)"

  RETURN epics_advanced
```

**Regla:** Solo avanza épicas — nunca retrocede. Si una épica ya está en `done`, no se toca.

### 1.2 Detectar épicas completadas (para sincronizar feature-status)

Después de §1.1, recopilar todas las épicas que quedaron en `done` (incluidas las que ya lo estaban antes):

```
FUNCTION detect_completed_epics():
  completed_epics = []

  FOR each epic_key IN development_status:
    IF epic_key MATCHES "epic-{N}" (not source, not retrospective):
      IF development_status[epic_key] == "done":
        completed_epics.APPEND(N)

  RETURN completed_epics
```

---

## 2. SINCRONIZACIÓN AUTOMÁTICA DE FEATURE-STATUS

**TRIGGER:** Ejecutar **siempre al final del Step 2**, antes de continuar al Step 3, **pero solo si la épica completada es la última de su feature** (ver §2.1).

### 2.1 Condición de activación — épica es la última de su feature

Antes de sincronizar, verificar si la épica completada es la **única épica** que mapea al `epic_source` del feature en `feature-status.yaml`. Si hay épicas de ese mismo feature que aún no están en `done`, no ejecutar la sincronización todavía.

```
FUNCTION is_last_epic_of_feature(epic_N, feature):
  // Encontrar todas las épicas que apuntan al mismo epic_source
  sibling_epics = []
  FOR each key IN sprint_status.development_status:
    IF key MATCHES "epic-{M}-source" AND value == feature.epic_source:
      sibling_epics.APPEND(M)

  // La épica es la última si todas las hermanas están done
  FOR each M IN sibling_epics:
    IF M != epic_N AND development_status["epic-{M}"] != "done":
      RETURN false  // aún hay épicas hermanas pendientes

  RETURN true  // todas las épicas del feature están done
```

Solo continuar con §2.2 si `is_last_epic_of_feature()` retorna `true` para al menos una épica completada.

### 2.2 Cargar feature-status.yaml

- Leer `{implementation_artifacts}/feature-status.yaml`
- Si no existe, no ejecutar esta sección (el archivo lo genera sprint-planning)

### 2.2 Ejecutar sync_feature_status() para cada feature

Aplicar la misma lógica definida en `_siesa-agents/bmm/workflows/4-implementation/sprint-planning/workflow_ext.md §3.4`:

```
FUNCTION sync_feature_status(feature):
  IF feature.status == "done":
    RETURN  // ya completado, no tocar

  // 1. Encontrar todas las épicas que pertenecen a este feature
  epics_of_feature = []
  FOR each key IN sprint_status.development_status:
    IF key MATCHES "epic-{N}-source" AND value == feature.epic_source:
      epics_of_feature.APPEND(N)

  IF epics_of_feature IS EMPTY:
    RETURN

  // 2. Recopilar todas las stories y sus statuses
  all_statuses = []
  FOR each N IN epics_of_feature:
    FOR each key IN sprint_status.development_status:
      IF key STARTS WITH "{N}-" AND NOT ends with "-source":
        all_statuses.APPEND(sprint_status.development_status[key])

  IF all_statuses IS EMPTY:
    RETURN

  // 3. Derivar nuevo status
  IN_PROGRESS_STATUSES = ["in-progress", "review", "ready-for-dev"]

  IF ALL statuses IN all_statuses == "done":
    new_status = "done"
  ELSE IF ANY status IN all_statuses IN IN_PROGRESS_STATUSES:
    new_status = "in-progress"
  ELSE:
    new_status = "backlog"

  // 4. Solo avanzar, nunca retroceder
  STATUS_ORDER = ["backlog", "in-progress", "done"]
  IF STATUS_ORDER.index(new_status) > STATUS_ORDER.index(feature.status):
    feature.status = new_status
    feature.last_update = {date}
```

**Reglas:**
- El status solo avanza (`backlog` → `in-progress` → `done`), **nunca retrocede**
- `ready-for-dev` y `review` cuentan como `in-progress` a nivel feature
- Si un feature ya está en `done`, no se toca

### 2.3 Guardar y reportar

- Si algún feature cambió de status, escribir el `feature-status.yaml` actualizado
- Reportar en el output del Step 4 cuántos features cambiaron (si alguno)

**FORMATO del reporte (agregar al bloque del Step 4 si hay cambios):**

```
**Feature Status sincronizado:**
  • feature-{N}: {status_anterior} → {status_nuevo}
```

Si no hubo cambios, no mostrar nada (silencioso).

---

## 3. REGLA CRÍTICA

**NUNCA** modificar el `status` ni `last_update` de features que ya están en `done`.

**NUNCA** retroceder un status (e.g., de `in-progress` a `backlog`).

**SOLO** ejecutar la sincronización cuando la épica completada sea la última de su feature (`is_last_epic_of_feature() == true`). Si el feature tiene más épicas pendientes, no tocar `feature-status.yaml`.

La verificación ocurre siempre al final del Step 2, antes de mostrar las opciones al usuario.
