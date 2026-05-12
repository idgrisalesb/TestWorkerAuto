# Sentinel Queue — Guía del Desarrollador

> **Feature**: Sentinel Queue — *Autonomous Agent Queue Runner*
> **Versión doc**: 1.0 (2026-05-08)
> **Audiencia**: desarrolladores que instalan y operan el queue en su equipo local

---

## Prerrequisitos

| Requisito | Versión mínima |
|---|---|
| Node.js | 20 LTS |
| Claude Code CLI (`claude`) | última disponible, sesión activa (`claude -p "OK"` debe responder) |
| Proyecto BMAD inicializado | con `_bmad-output/implementation-artifacts/sprint-status.yaml` |

> **Autenticación**: `sentinel-queue` invoca `claude -p` como subproceso invisible (sin abrir ninguna terminal). Si ya estás logueado con `claude` (sesión OAuth local en `~/.config/claude/`), no necesitás `ANTHROPIC_API_KEY`. Si usás autenticación por API key, seteá la variable antes de iniciar el daemon.

---

## 1. Instalación

El instalador de `siesa-agents` copia automáticamente `queue-runner/` al proyecto cliente. No se requiere paso adicional:

```bash
cd <mi-proyecto-bmad>
npx siesa-agents@latest
```

Esto deja `_siesa-agents/queue-runner/` en tu proyecto. El entrypoint `npx siesa-agents queue` permanece en el paquete y no necesita copiarse.

---

## 2. Primer arranque (una sola vez por proyecto)

### 2.1 Inicializar el queue

```bash
npx siesa-agents queue init
```

Crea `~/.siesa-queue/` (o la ruta en `SIESA_QUEUE_HOME`) con la siguiente estructura:

```
~/.siesa-queue/
├── queue.db                  ← SQLite con toda la cola (WAL mode)
├── model-policy.json         ← qué modelo usa cada tipo de job
├── rate-limit-patterns.json  ← patrones de detección hot-reloadables
└── logs/
    └── queue-YYYY-MM-DD.ndjson
```

Si no hay sesión activa de Claude Code ni `ANTHROPIC_API_KEY` en el entorno, el comando lo advertirá y te pedirá que hagas `claude` para autenticarte.

### 2.2 (Opcional) Inicializar con directorio por proyecto

```bash
npx siesa-agents queue init --home .siesa-queue
# Recomendado si trabajas con múltiples repos simultáneamente
```

---

## 3. Cargar el plan del sprint

### Modo épica (recomendado desde v2.2)

```bash
npx siesa-agents queue add --from-epics
# Lee sprint-status.yaml, crea 1 job quick-dev por cada épica no completada
# Cada job invoca /sa-quick-dev <N> que orquesta todas las historias de la épica
# Orden garantizado: épica 1 antes que épica 2 (por priority = 100 + epic_number)
# Todas usan correlation_key="bmad-cycle" → ejecución estrictamente secuencial
```

Para épicas con dependencias no lineales (ej. épica 3 requiere épica 1 pero no la 2):
```bash
npx siesa-agents queue add --type quick-dev --epic 3 --depends-on-epics 1
```

Si se ejecuta dos veces, la segunda invocación reporta **0 jobs nuevos** gracias al `UNIQUE(input_fingerprint)`.

### Modo historia individual (legacy — CA #2)

```bash
npx siesa-agents queue add --from-sprint-status
# Lee sprint-status.yaml, encola 3 jobs (create-story + dev-story + code-review)
# por cada historia con status ready-for-dev o in-progress
# Útil para re-ejecutar workflows individuales o granularidad fina
```

### Encolar jobs individuales

```bash
# Una historia específica
npx siesa-agents queue add --type dev-story --story 1-3 --epic 1

# Forzar modelo distinto al de la política
npx siesa-agents queue add --type dev-story --story 1-3 --epic 1 --model opus

# Prioridad alta (número menor = antes)
npx siesa-agents queue add --type dev-story --story 1-3 --epic 1 --priority 10

# Prompt custom libre
npx siesa-agents queue add --custom --prompt "Revisar README del epic 2" --tools "Read,Edit"
```

### Revisar la cola antes de arrancar

```bash
npx siesa-agents queue list --state pending
# ID  TYPE        STORY  STATE    PRIORITY  MODEL    ETA
#  1  dev-story   1-3    pending  100       sonnet   -
#  2  code-review 1-3    pending  100       haiku    -
```

---

## 4. Ejecutar el daemon

### Modo desarrollo — foreground (recomendado para empezar)

```bash
npx siesa-agents queue start --foreground --verbose
```

- Corre en la terminal activa.
- `Ctrl+C` lo detiene limpiamente; el estado queda consistente en SQLite.
- Al volver a ejecutar, reanuda desde donde quedó.

### Modo producción — servicio del SO

```bash
npx siesa-agents queue install-service
```

Detecta el SO automáticamente e instala daemon + watchdog:

| OS | Daemon | Watchdog |
|---|---|---|
| Linux | `systemd --user` (con `loginctl enable-linger`) | crontab `*/5 * * * *` |
| macOS | `LaunchAgent` en `~/Library/LaunchAgents` | LaunchAgent secundario `StartInterval=300` |
| Windows | Task Scheduler `AtLogOn` + restart | Task Scheduler `RepetitionInterval=5min` |

**Control del servicio:**

```bash
# Linux
systemctl --user start   siesa-queue
systemctl --user stop    siesa-queue
systemctl --user restart siesa-queue
systemctl --user status  siesa-queue

# macOS
launchctl kickstart -k gui/$(id -u)/com.siesa.queue
launchctl bootout      gui/$(id -u)/com.siesa.queue

# Windows (PowerShell)
Start-ScheduledTask -TaskName SiesaQueue
Stop-ScheduledTask  -TaskName SiesaQueue
```

---

## 5. Monitoreo

### Snapshot ejecutivo

```bash
npx siesa-agents queue status
```

```
┌─────────────────────────────────────────────────────┐
│ Jobs: 2 pending | 1 running | 5 succeeded | 0 failed│
│ Costo hoy:  $0.43 (sonnet) + $0.08 (haiku)         │
│ Costo total: $1.21                                  │
│ Próximo reset: —                                    │
│ Daemon heartbeat: hace 8 s                          │
└─────────────────────────────────────────────────────┘
```

```bash
# Formato JSON para scripts
npx siesa-agents queue status --json
```

### Streaming de logs en vivo

```bash
# Todo el daemon
npx siesa-agents queue logs --follow

# Solo un job específico
npx siesa-agents queue logs --follow --job 42
```

**Ejemplo de salida normal:**

```jsonl
{"ts":"2026-05-08T14:22:01Z","level":"info","event":"job.claim","job_id":1,"model":"sonnet","msg":"claimed dev-story 1-3"}
{"ts":"2026-05-08T14:22:02Z","level":"info","event":"stream.tool_use","job_id":1,"tool":"Edit","input":"src/foo.ts"}
{"ts":"2026-05-08T14:25:44Z","level":"info","event":"job.finish","job_id":1,"is_error":false,"duration_ms":222000,"cost_usd":0.4321}
```

**Cuando detecta rate-limit:**

```jsonl
{"level":"warn","event":"rate_limit.detected","category":"plan_exhaustion","reset_ts":1715190000,"pattern":"claude_usage_limit"}
{"level":"info","event":"rate_limit.countdown","wait_remaining_s":17640,"msg":"esperando reset ventana"}
{"level":"info","event":"job.resume","msg":"ventana reabierta, volviendo a pending"}
```

### Listar jobs por estado

```bash
npx siesa-agents queue list                          # todos
npx siesa-agents queue list --state pending
npx siesa-agents queue list --state running
npx siesa-agents queue list --state waiting_rate_limit
npx siesa-agents queue list --state failed
npx siesa-agents queue list --state succeeded
```

### Inspección directa de la base de datos

```bash
# Estado general de jobs
sqlite3 ~/.siesa-queue/queue.db \
  "SELECT id, type, state, attempts, last_error FROM jobs;"

# Costo acumulado por modelo
sqlite3 ~/.siesa-queue/queue.db \
  "SELECT model, SUM(cost_usd) FROM cost_ledger GROUP BY model;"

# Ventanas de rate-limit activas
sqlite3 ~/.siesa-queue/queue.db \
  "SELECT * FROM rate_limit_windows WHERE closed_at IS NULL;"

# Heartbeat del daemon
sqlite3 ~/.siesa-queue/queue.db \
  "SELECT * FROM daemon_heartbeat;"
```

---

## 6. Detener y controlar jobs

| Necesidad | Comando |
|---|---|
| Detener daemon (foreground) | `Ctrl+C` |
| Detener servicio Linux | `systemctl --user stop siesa-queue` |
| Detener servicio macOS | `launchctl bootout gui/$(id -u)/com.siesa.queue` |
| Detener servicio Windows | `Stop-ScheduledTask -TaskName SiesaQueue` |
| Cancelar un job (mata run activo) | `npx siesa-agents queue cancel <id>` |
| Abandonar un job (sin tocar run) | `npx siesa-agents queue abandon <id>` |
| Reintentar un job fallido | `npx siesa-agents queue retry <id>` |
| Pausar todo el daemon | `npx siesa-agents queue config set paused true` |
| Reanudar el daemon | `npx siesa-agents queue config set paused false` |

---

## 7. Flujo del sprint autónomo (uso típico)

Una vez instalado el servicio, el flujo semanal es:

```bash
# Lunes — inicio de sprint (< 2 minutos de trabajo humano)
npx siesa-agents queue add --from-epics       # 1 job por épica, en orden
npx siesa-agents queue status      # confirmar que quedó encolado

# El daemon hace todo lo demás automáticamente:
# ├── Ejecuta historias secuencialmente
# ├── Si llega al límite del plan → espera y retoma solo
# └── Termina el sprint durante la noche o el fin de semana

# Cuando quieras revisar el avance
npx siesa-agents queue status
npx siesa-agents queue logs --follow
```

**Lo que ya no tienes que hacer:**
- Detectar cuándo se agotó el plan manualmente
- Calcular cuándo se reabre la ventana
- Volver a lanzar el script en el momento correcto
- Vigilar que no se dupliquen efectos en el repo

---

## 8. Troubleshooting

### Daemon no arranca

```bash
# Ver logs de error
tail -100 ~/.siesa-queue/logs/stderr.log

# Forzar arranque en foreground para ver el error
npx siesa-agents queue start --foreground --verbose

# Si la DB cambió de versión
npx siesa-agents queue migrate
```

### Cola atascada en `waiting_rate_limit`

```bash
npx siesa-agents queue list --state waiting_rate_limit
sqlite3 ~/.siesa-queue/queue.db \
  "SELECT * FROM rate_limit_windows WHERE closed_at IS NULL;"
```

- Si `reset_ts` es razonable → esperar, el daemon reanuda solo.
- Si `reset_ts` está mal calculado → `npx siesa-agents queue retry <id>` (pasa a `pending` con `not_before_ts=now`).
- Si todos los jobs lo tienen pero la cuenta NO está bloqueada → revisar patrones: `npx siesa-agents queue config reload-patterns`.

### Daemon vivo pero bloqueado (watchdog no reaccionó)

```bash
# Verificar estado semántico
npx siesa-agents queue health
# Salida "ok" → daemon vivo y activo
# Exit code 2 → heartbeat stale, reiniciar manualmente

# Linux
systemctl --user restart siesa-queue
# macOS
launchctl kickstart -k gui/$(id -u)/com.siesa.queue
```

### Job fallando repetidamente

```bash
# Ver historial de intentos
npx siesa-agents queue logs --job <id>

# Ver último error
sqlite3 ~/.siesa-queue/queue.db \
  "SELECT last_error, attempts, max_retries FROM jobs WHERE id=<id>;"

# Resetear contador de intentos y reintentar
npx siesa-agents queue retry <id>
```

---

## 9. Variables de entorno

| Variable | Default | Uso |
|---|---|---|
| `ANTHROPIC_API_KEY` | (opcional si usás sesión OAuth local de Claude Code) | Pasada al CLI Claude en cada invocación; no necesaria si `claude` ya está logueado localmente |
| `SIESA_QUEUE_HOME` | `~/.siesa-queue` | Ruta de DB, logs y config |
| `SIESA_QUEUE_MAX_CONCURRENCY` | `1` | Workers paralelos (ver nota) |
| `SIESA_QUEUE_DEFAULT_MODEL` | (usa policy) | Override global de modelo |
| `SIESA_QUEUE_TICK_MS` | `5000` | Frecuencia del bucle dispatcher |
| `SIESA_QUEUE_HEARTBEAT_MS` | `15000` | Frecuencia del heartbeat |
| `SIESA_QUEUE_HEARTBEAT_STALE_S` | `180` | Umbral watchdog (matar si supera) |
| `SIESA_QUEUE_LOG_LEVEL` | `info` | `debug` / `info` / `warn` / `error` |
| `SIESA_QUEUE_WAKE_LOCK` | `auto` | `auto` / `always` / `never` |
| `SA_OTLP_ENDPOINT` | (none) | Para integración Loki/Tempo (Fase 5) |

> **Nota concurrencia**: mantener `MAX_CONCURRENCY=1` (default) hasta que las escrituras BMAD estén migradas a archivos por-historia. Subir a 2-3 solo con `correlation_key` distintos garantizados y cuotas separadas.

---

## 10. Referencia rápida de comandos

```bash
npx siesa-agents queue init                                        # inicializar (una vez)
npx siesa-agents queue add --from-epics                           # cargar sprint (modo épica, recomendado)
npx siesa-agents queue add --from-sprint-status                   # cargar sprint (modo historia, legacy)
npx siesa-agents queue add --type quick-dev --epic N              # épica individual
npx siesa-agents queue add --type quick-dev --epic N --depends-on-epics 1,2  # con dependencias
npx siesa-agents queue add --type dev-story --story X-Y --epic N
npx siesa-agents queue list [--state <estado>]       # ver cola
npx siesa-agents queue start --foreground --verbose  # arrancar en terminal
npx siesa-agents queue install-service               # instalar servicio SO
npx siesa-agents queue uninstall-service             # desinstalar servicio
npx siesa-agents queue status [--json]               # snapshot ejecutivo
npx siesa-agents queue logs [--follow] [--job ID]    # ver logs
npx siesa-agents queue retry <id>                    # reintentar job
npx siesa-agents queue cancel <id>                   # cancelar job activo
npx siesa-agents queue health                        # check del watchdog
npx siesa-agents queue migrate                       # migrar schema DB
npx siesa-agents queue sessions prune --older-than 30d
npx siesa-agents queue config set <key> <value>
npx siesa-agents queue export --since 7d
```

---

## 11. Módulos lib del queue-runner (referencia)

| Módulo | Exports clave | Descripción |
|---|---|---|
| `lib/db.js` | `openDb(path)` | Abre SQLite con WAL + migraciones automáticas |
| `lib/schema.sql` | — | DDL completo (PRAGMA user_version=4) |
| `lib/prompt-builder.js` | `buildPrompt(job)` | Construye el prompt según `payload.type`; tipos: `quick-dev`, `create-story`, `dev-story`, `code-review`, `custom` |
| `lib/sprint-status-parser.js` | `parseSprintStatus(path)`, `getEpicStatuses(path)` | Lee `sprint-status.yaml` sin librerías; `parseSprintStatus` devuelve historias `ready-for-dev`/`in-progress`; `getEpicStatuses` devuelve `{epicN: status}` |
| `lib/dependencies.js` | `checkDependencies(job, epicStatuses?, root?)`, `resolveSprintStatusPath(root?)` | Valida que los `depends_on_epics` del payload estén todos en `done`; `resolveSprintStatusPath` busca el archivo en los dos paths canónicos de BMAD |
| `lib/sessions.js` | `resolveSessionId(job, db)`, `markAbandoned(db, s)`, `pruneStats(db, s)` | Gestiona `--session-id` por `correlation_key`; devuelve `{sessionId, isNew}` |
| `lib/cost.js` | `resolveModel(job, policy)`, `calcCost(usage, model, policy)`, `recordCost(db, ...)` | Calcula y persiste `cost_usd` en `cost_ledger` |
| `lib/rate-limit.js` | `loadPatterns`, `detectRateLimit`, `extractResetTs`, `calcBackoff` | Detección y manejo de límites de la API |
| `lib/wake-lock.js` | `WakeLock` | Inhibe suspensión del SO mientras hay jobs en vuelo |
| `lib/telemetry-bridge.js` | `TelemetryBridge` | Puente a `sa-emit.js` para métricas OTLP |
| `lib/logger.js` | `createLogger`, `currentLogPath` | Winston NDJSON con rotación diaria |
| `lib/semaphore.js` | `Semaphore` | Semáforo en memoria (expuesto, no usado en dispatcher actual) |

### Nuevo tipo de job `quick-dev`

El tipo `quick-dev` (`lib/prompt-builder.js`) orquesta una épica completa delegando en `/sa-quick-dev`:

```js
// payload esperado
{ type: 'quick-dev', epic: 3, depends_on_epics: [1, 2] }

// prompt generado por buildPrompt
"/sa-quick-dev 3. Unattended mode: do not ask questions, proceed autonomously on epic 3."
```

El campo `depends_on_epics` es opcional. Cuando está presente, `lib/dependencies.js:checkDependencies` lo valida en cada tick del dispatcher antes de claimear el job. La función lee `sprint-status.yaml` en cada claim (overhead mínimo — archivo <10 KB típicamente).

---

## 12. Estado de implementación

| Fase | Estado | Entregable |
|---|---|---|
| 0 — Scaffolding | Pendiente | DB + CLI de solo lectura (`init`, `add`, `list`) |
| 1 — Dispatcher + Worker | Pendiente | End-to-end secuencial, `start --foreground` |
| 2 — Rate-limit + retry | Pendiente | `waiting_rate_limit`, backoff, crash recovery |
| 3 — Sessions + Costs | Pendiente | `correlation_key`, `cost_ledger`, `queue status` con costos |
| 4 — Multi-OS service | Pendiente | `install-service`, wake-lock |
| 5 — Telemetría OTLP | Pendiente | Loki/Tempo, refactor `sa-emit.js` |

> Ver descripcion del feature, casos de uso y archivos principales en [`docs/sentinel-queue.md`](./sentinel-queue.md).
