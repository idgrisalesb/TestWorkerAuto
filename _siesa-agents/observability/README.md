# Observability Module

Instrumentación de los workflows BMAD para medir el tiempo real por historia de usuario.

## Qué hace

Cada workflow (`create-story`, `dev-story`, `code-review`) emite **3 eventos** a Loki via el script `sa-emit.js`:

1. `workflow.started` — al inicio del workflow, después de identificar la historia
2. `status.changed` — cuando cambia el estado en `sprint-status.yaml`
3. `workflow.finished` — al finalizar el workflow (incluye `duration_ms`)

## Script: `sa-emit.js`

```bash
# Inicio de workflow
node sa-emit.js --event workflow.started --story "1-1-user-auth" --phase "create-story"

# Transición de estado
node sa-emit.js --event status.changed --story "1-1-user-auth" --phase "create-story" --from "backlog" --to "ready-for-dev"

# Fin de workflow (calcula duration_ms automáticamente)
node sa-emit.js --event workflow.finished --story "1-1-user-auth" --phase "create-story"
```

### Parámetros

| Parámetro       | Requerido          | Valores |
|---|---|---|
| `--event`       | Sí                 | `workflow.started`, `workflow.finished`, `status.changed`, `fix.started`, `fix.finished` |
| `--story`       | Sí                 | Story key (e.g. `1-1-user-auth`) |
| `--phase`       | Sí                 | `create-story`, `dev-story`, `code-review` |
| `--from`        | Solo en transition | Estado origen (e.g. `backlog`) |
| `--to`          | Solo en transition | Estado destino (e.g. `ready-for-dev`) |
| `--fix-option`  | Solo en fix.*      | `auto_fix`, `action_items`, `show_details` |

### Configuración

| Variable de entorno | Default | Descripción |
|---|---|---|
| `SA_OTLP_ENDPOINT` | `http://localhost:4318` | URL base del OTel collector (OTLP HTTP) |

### Fallback

Si el OTel collector no está disponible, los eventos se guardan en `~/.claude/observability/buffer/events.jsonl` para reenvío manual.

## Estructura del evento

```json
{
  "event": "workflow.finished",
  "story_id": "1-1-user-auth",
  "epic_id": "1",
  "phase": "create-story",
  "duration_ms": 1140000
}
```

## Queries en Grafana (Loki)

```logql
# Timeline de una historia
{job="bmad"} | json | story_id="1-1-user-auth"

# Duración de workflows finalizados
{job="bmad"} | json | event="workflow.finished"

# Historias completadas (última semana)
count_over_time({job="bmad"} | json | event="status.changed" | to="done" [7d])

# Interacciones del usuario en un workflow (telemetría nativa)
{service_name="claude-code"} | json | event_name="user_prompt" | session_id="<id>"
```

## Transiciones por workflow

| Workflow | Transiciones emitidas |
|---|---|
| `create-story` | `backlog → ready-for-dev` |
| `dev-story` | `ready-for-dev → in-progress`, `in-progress → review` |
| `code-review` | `review → done` o `review → in-progress` (rework) |
