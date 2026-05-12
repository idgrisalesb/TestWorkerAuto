---
description: 'Pipeline secuencial de sub-agentes por épica: crea, desarrolla y revisa TODAS las historias de una épica usando sub-agentes aislados. Soporta modo desatendido: respeta el estado actual de cada historia y solo ejecuta las etapas pendientes.'
---

## PASO 0 — Identificar la épica

### 0.1 — Obtener el número de épica

Si `$ARGUMENTS` no contiene un número de épica, aborta inmediatamente con este mensaje y no continúes:

```
ERROR: sa-quick-dev requiere el número de épica como argumento.
Uso: /sa-quick-dev <N>   (por ejemplo: /sa-quick-dev 3)
```

Extrae el número de épica del primer token numérico en `$ARGUMENTS`.

Contexto adicional del usuario: $ARGUMENTS

### 0.2 — Leer sprint-status.yaml

Busca `sprint-status.yaml` en los siguientes paths (en orden) y usa el primero que exista:
1. `_bmad-output/implementation-artifacts/sprint-status.yaml`
2. `_bmad-output/shared-artifacts/implementation-artifacts/sprint-status.yaml`

Si ninguno existe, aborta con error claro indicando los paths buscados.

Extrae de la sección `development_status`:
- El status de la épica seleccionada (`epic-N: {status}`)
- El status de cada story de esa épica (entradas `{N}-{M}-{slug}: {status}`)

### 0.3 — Resolver la fuente de la épica

Con la épica N seleccionada, determina dónde están los detalles:

1. Busca en `sprint-status.yaml` si existe el marcador `epic-N-source` (ej: `epic-3-source: _bmad-output/planning-artifacts/epics/epic-02-metodos.md`)
2. **Si existe `epic-N-source`**: la fuente es el archivo shardeado indicado en ese marcador. Léelo para obtener las historias de la épica.
3. **Si NO existe `epic-N-source`**: la fuente es el archivo consolidado `_bmad-output/planning-artifacts/epics.md`. Léelo y extrae la sección de la épica N.

### 0.4 — Identificar historias pendientes

Con la fuente de la épica resuelta y el `sprint-status.yaml`:
- Cruza las historias definidas en la fuente de la épica con los estados del `sprint-status.yaml`
- Las historias pendientes son aquellas cuyo status NO es `done`
- Ordénalas por su número de historia (N-M)

Informa cuántas historias se van a procesar y cuáles son, con su status actual y las etapas que se ejecutarán para cada una.

---

## PASO 1 — Loop de procesamiento por historia

Para CADA historia pendiente de la épica seleccionada, ejecuta las etapas que correspondan según el estado actual. **Antes de cada historia, re-lee `sprint-status.yaml`** para obtener el estado más reciente (los sub-agentes anteriores pueden haberlo actualizado).

### Reglas de punto de entrada por status

| Status actual | Etapas a ejecutar | Motivo |
|---|---|---|
| `backlog` | A → B → C | Historia sin crear |
| `ready-for-dev` | B → C | Ya creada, falta implementar |
| `in-progress` | B → C | Implementación incompleta o interrumpida |
| `review` | C | Implementada, falta revisión |
| `done` | — (saltar) | Completada |
| otro / desconocido | — (saltar con warning) | Estado no reconocido |

Los sub-agentes están definidos en `.claude/agents/` y DEBES invocarlos por nombre usando la herramienta Agent con `subagent_type`.

---

### SUB-AGENTE A — Create Story

Solo ejecutar si el status es `backlog`.

Usa la herramienta Agent con `subagent_type: "sa-create-story"` y pasa como prompt:

```
Épica: {EPIC_NUMBER} - {EPIC_TITLE}
Fuente de la épica: {EPIC_SOURCE_FILE_PATH}
Historia a crear: Story {N}.{M}: {STORY_TITLE}
Descripción: {STORY_DESCRIPTION_FROM_EPICS_FILE}
```

**ESPERA** a que complete. Si falla, registra el fallo y pasa a la siguiente historia (salta B y C para esta historia).

---

### SUB-AGENTE B — Dev Story

Solo ejecutar si el status era `backlog` (y A fue exitoso), `ready-for-dev`, o `in-progress`.

Usa la herramienta Agent con `subagent_type: "sa-dev-story"` y pasa como prompt:

```
Historia a implementar: {STORY_FILE_PATH}
Épica: {EPIC_NUMBER} - {EPIC_TITLE}
Fuente de la épica: {EPIC_SOURCE_FILE_PATH}
```

**ESPERA** a que complete. Si falla, registra el fallo y pasa a la siguiente historia (salta C para esta historia).

---

### SUB-AGENTE C — Code Review

Solo ejecutar si el status correspondiente fue alcanzado y las etapas anteriores (si aplican) fueron exitosas, o si el status era `review`.

Usa la herramienta Agent con `subagent_type: "sa-code-review"` y pasa como prompt:

```
Historia a revisar: {STORY_FILE_PATH}
Épica: {EPIC_NUMBER} - {EPIC_TITLE}
Fuente de la épica: {EPIC_SOURCE_FILE_PATH}
```

**ESPERA** a que complete.

---

### Feedback intermedio por historia

Después de completar las etapas de una historia, muestra un resumen de UNA línea:

```
✅ Story {N}.{M} [{título}]: create ✅ → dev ✅ → review ✅ (PASS)
```

o en caso de salto:

```
⏭️ Story {N}.{M} [{título}]: saltar (status: ready-for-dev → dev ✅ → review ✅) (PASS)
```

o en caso de fallo:

```
❌ Story {N}.{M} [{título}]: create ✅ → dev ❌ (FAIL: motivo breve)
```

Luego continúa con la siguiente historia.

---

## PASO 2 — Reporte Final

Al completar TODAS las historias de la épica, presenta un reporte consolidado:

```
## Pipeline sa-quick-dev — Epic {N}: {título}

### Resumen
- Historias procesadas: X/Y
- Exitosas (pipeline completado): X
- Con fallos: X
- Saltadas (ya done): X

### Detalle por Historia

| Historia | Create | Dev | Review | Estado |
|----------|--------|-----|--------|--------|
| {N}.1 - {título} | ✅ | ✅ | ✅ PASS | Completada |
| {N}.2 - {título} | ⏭️ (ready-for-dev) | ✅ | ⚠️ PASS c/obs | Completada |
| {N}.3 - {título} | ✅ | ❌ | ⏭️ | Fallo en dev |

### Historias que requieren atención manual
- [lista de historias con fallos y razón]
```

Si TODAS las historias pasaron, confirma que la épica está completa.
Si alguna falló, indica cuáles requieren intervención manual y por qué.
