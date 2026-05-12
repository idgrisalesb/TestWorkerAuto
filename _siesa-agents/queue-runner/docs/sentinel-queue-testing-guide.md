# Sentinel Queue — Guía de Pruebas y Verificación

> **Fecha**: 2026-05-11
> **Versión**: `siesa-agents` v2.1.77 — branch `queue-runner`
> **Propósito**: Verificar que la implementación cubre los 18 Criterios de Aceptación (CA) y los dos casos de uso principales del feature.

---

## 0. Contexto: Casos de Uso y Modo de Ejecución

### 0.1 Diferencia con `/sa-quick-dev`

| Aspecto | `/sa-quick-dev` | `sentinel-queue` |
|---|---|---|
| Runtime | Dentro de una sesión Claude Code interactiva | Proceso Node.js independiente (daemon) |
| Supervivencia al cerrar terminal | No — muere con la sesión | Sí — proceso detached |
| Rate-limit | Detiene el flujo, requiere re-lanzar | Detecta, espera y reanuda solo |
| Cola | No tiene — ejecuta historia por historia | SQLite persistente, múltiples jobs |
| Monitoreo | La sesión activa | `queue status`, `queue logs --follow` desde cualquier terminal |
| Autonomía | Semi-desatendido | Completamente desatendido |

### 0.2 Modos de ejecución disponibles

```
# MODO A — Foreground (desarrollo, debug, verificación)
npx siesa-queue start --foreground [--verbose]

# MODO B — Background detached (CASO PRINCIPAL: durante jornada o noche)
npx siesa-queue start --detach
# El daemon queda como proceso independiente (grupo propio, sin tty).
# Sobrevive el cierre de la terminal en Linux/macOS.
# Logs → ~/.siesa-queue/daemon.log + logs rotativos NDJSON

# MODO C — Servicio del SO (opcional: sobrevive reboots)
npx siesa-queue install-service [--wake-lock]
# Instala como systemd-user (Linux), LaunchAgent (macOS),
# o Task Scheduler (Windows). Arranca automáticamente al reiniciar.
```

> **Para los casos de uso descritos (noche/fin de semana y background durante jornada), el Modo B (`--detach`) es suficiente.** El Modo C agrega la capa de "sobrevive reboot" que es opcional para una máquina de developer que normalmente no se apaga.

---

## 1. Prerequisitos

### 1.1 Entorno

```bash
node --version                     # Requerido: >=20.0.0
claude --version                   # Claude Code CLI instalado
claude -p "responde solo OK" 2>&1  # Verificar sesión local activa (no requiere API key si ya estás logueado con `claude`)
```

> **Nota**: `sentinel-queue` invoca `claude -p` como subproceso. No abre ninguna terminal ni ventana. `claude` se autentica con la sesión local guardada en `~/.claude/` — la misma con la que ya estás logueado interactivamente. `ANTHROPIC_API_KEY` solo es necesaria si usás autenticación por API key en lugar de la sesión OAuth de Claude Code.

> **No se requiere `sqlite3` instalado en el sistema.** Los comandos de verificación de DB usan `npx siesa-queue db "..."` que usa la misma librería Node.js (`better-sqlite3`) empaquetada con `siesa-agents`. Funciona igual en Windows, macOS y Linux sin permisos de administrador.

### 1.2 Instalación del paquete

```bash
cd <proyecto-bmad>
npx siesa-agents@latest      # Distribuye queue-runner → _siesa-agents/queue-runner/
# o bien, desde el repo de desarrollo:
npm link                      # Enlaza el paquete local
```

### 1.3 Acceso al CLI

El paquete `siesa-agents` no se instala globalmente: el postinstall solo copia archivos al cwd. Por eso todos los comandos del queue se invocan con `npx`:

```bash
npx siesa-queue --help

# Alternativa: instalar una sola vez en global y omitir el prefijo en lo sucesivo
npm install -g siesa-agents
npx siesa-queue --help
```

> **Nota**: esta guía usa `npx siesa-queue ...` en todos los snippets (modo soportado por defecto). Si instalaste con `-g`, podés omitir el prefijo `npx`.

### 1.4 Estado del sprint de prueba

Para las pruebas de flujo BMAD necesitas un `sprint-status.yaml` con al menos una historia `ready-for-dev`:

```bash
cat _bmad-output/implementation-artifacts/sprint-status.yaml | grep -E "ready-for-dev|backlog"
```

### 1.5 Limpiar la base de datos entre bloques de prueba (opcional)

> **Cuándo usarlo**: al pasar de un bloque de prueba al siguiente, o cuando la DB acumuló jobs de runs anteriores y querés empezar desde cero.

Hay dos opciones según lo que necesitás preservar:

**Opción A — Reset completo** (recomendada al cambiar de bloque):
```bash
rm ~/.siesa-queue/queue.db
npx siesa-queue init
```
Elimina todos los datos (jobs, runs, costos, sesiones) y recrea el schema desde cero. Los archivos de configuración (`model-policy.json`, `rate-limit-patterns.json`) **no se tocan**.

**Opción B — Limpiar solo los datos, mantener el schema**:
```bash
npx siesa-queue db "DELETE FROM jobs"
npx siesa-queue db "DELETE FROM runs"
npx siesa-queue db "DELETE FROM events"
npx siesa-queue db "DELETE FROM cost_ledger"
npx siesa-queue db "DELETE FROM sessions"
npx siesa-queue db "DELETE FROM rate_limit_windows"
```
Útil cuando querés conservar el historial de migraciones o verificar el schema intacto.

Verificar que la limpieza quedó:
```bash
npx siesa-queue db "SELECT COUNT(*) FROM jobs"   # debe retornar 0
npx siesa-queue list                              # debe mostrar "No jobs found."
```

---

## 2. BLOQUE 0 — Inicialización (CA #9)

### T-01: Inicializar el directorio del queue

```bash
npx siesa-queue init
```

**Verificar:**
- [ ] Directorio `~/.siesa-queue/` creado con subdirectorio `logs/`
- [ ] Archivo `~/.siesa-queue/queue.db` existe
- [ ] Archivo `~/.siesa-queue/model-policy.json` copiado desde defaults
- [ ] Archivo `~/.siesa-queue/rate-limit-patterns.json` copiado
- [ ] Si existe `~/.claude/.credentials.json` (sesión OAuth de Claude Code) → imprime "Detected Claude Code OAuth session ..." y NO pide API key
- [ ] Si `ANTHROPIC_API_KEY` está en env → imprime "ANTHROPIC_API_KEY already set"
- [ ] Solo si no hay OAuth ni env var → prompea "Enter ANTHROPIC_API_KEY:" (se puede saltar con Enter, imprime warning)

```bash
npx siesa-queue db "PRAGMA user_version"   # debe retornar >=4
npx siesa-queue db ".tables"               # 7+ tablas esperadas
```

### T-02: Doble `init` — idempotencia

```bash
npx siesa-queue init    # segunda vez
```

**Verificar:**
- [ ] No hay error
- [ ] No duplica tablas ni configs (comportamiento `CREATE TABLE IF NOT EXISTS`)

---

## 3. BLOQUE 1 — Gestión de la Cola (CA #2, #9, #12)

### T-03: Agregar job individual tipado

```bash
npx siesa-queue add --type dev-story --story 1-1 --epic 1
npx siesa-queue list
```

**Verificar:**
- [ ] Job aparece en lista con `state=pending`
- [ ] Campo `correlation_key` = `story-1-1`
- [ ] `input_fingerprint` calculado (no null)

### T-04: Idempotencia al agregar el mismo job (CA #12)

```bash
npx siesa-queue add --type dev-story --story 1-1 --epic 1   # mismo job
```

**Verificar:**
- [ ] Output: `0 jobs nuevos (ya existe, idempotencia)`
- [ ] `queue list` sigue mostrando solo 1 job con ese story_id

```bash
# Verificar directamente en DB
npx siesa-queue db "SELECT COUNT(*) FROM jobs WHERE payload_json LIKE '%1-1%'"
# Debe retornar 1
```

### T-05a: Importar épicas (modo recomendado — CA #2)

```bash
npx siesa-queue add --from-epics
```

**Verificar:**
- [ ] Por cada épica con status `!= done`: se crea 1 job `quick-dev` con `correlation_key = "bmad-cycle"`
- [ ] `priority = 100 + epic_number` (épica 1 → 101, épica 2 → 102…)
- [ ] `siesa-queue list` muestra los jobs ordenados por prioridad

```bash
npx siesa-queue db "SELECT type, priority, correlation_key, payload_json FROM jobs ORDER BY priority"
# Debe mostrar quick-dev jobs con bmad-cycle key
```

### T-05b: Importar épicas con dependencia explícita

```bash
# Épica 3 solo puede correr cuando épica 1 esté done
npx siesa-queue add --type quick-dev --epic 3 --depends-on-epics 1
```

**Verificar:**
- [ ] Job con `payload_json` conteniendo `depends_on_epics: [1]`
- [ ] Con `correlation_key = "bmad-cycle"`

```bash
npx siesa-queue db "SELECT payload_json FROM jobs WHERE type='quick-dev'"
# Debe mostrar {"type":"quick-dev","epic":3,"depends_on_epics":[1]}
```

### T-05c: Importar historias individuales (modo legacy — CA #2)

```bash
npx siesa-queue add --from-sprint-status
```

**Verificar:**
- [ ] Solo historias con status `ready-for-dev` o `in-progress` generan jobs (no `backlog`, no `review`)
- [ ] Por cada historia válida: se crean 3 jobs (`create-story`, `dev-story`, `code-review`)
- [ ] Todos con el mismo `correlation_key = story-N-M`

### T-06: Doble importación — idempotencia (CA #12)

```bash
npx siesa-queue add --from-epics    # segunda vez
```

**Verificar:**
- [ ] Output: `0 jobs nuevos`
- [ ] No hay duplicados en la DB

```bash
npx siesa-queue db "SELECT COUNT(*) FROM jobs"   # mismo número
```

### T-07: Job custom

```bash
npx siesa-queue add --custom --prompt "Lee el archivo CLAUDE.md y resume su contenido en 3 puntos" \
  --tools "Read" --model haiku
npx siesa-queue list
```

**Verificar:**
- [ ] Job `custom` en estado `pending`
- [ ] Modelo `haiku` asignado como `model_override`

### T-08: Prioridad de jobs

```bash
npx siesa-queue add --type code-review --story 2-1 --epic 2 --priority 10
npx siesa-queue list
```

**Verificar:**
- [ ] Job con `priority=10` aparece antes que los de `priority=100` (default) en el listado

---

## 4. BLOQUE 2 — Ejecución Foreground y Ciclo de Vida (CA #1, #3, #6, #9)

> Estos tests usan `--foreground` para observar el output directamente. El flujo real usará `--detach`.

### T-09: Smoke test — job hasta `succeeded`

```bash
# Preparar: cola limpia (ver §1.5 si venís de un bloque anterior)
rm ~/.siesa-queue/queue.db && npx siesa-queue init
npx siesa-queue add --custom \
  --prompt "Responde SOLO con la palabra OK. No hagas nada más." \
  --tools "Read" --model haiku

# Ejecutar
npx siesa-queue start --foreground --verbose
# Dejar correr hasta que el job termine (Ctrl+C para salir)
```

**Verificar:**
- [ ] Output NDJSON en pantalla con eventos `job.claim`, `stream.tool_use` o `stream.text_delta`, `job.finish`
- [ ] `npx siesa-queue status` muestra `succeeded: 1`
- [ ] Fila en tabla `runs` con `is_error=0`
- [ ] Fila en tabla `cost_ledger` con `cost_usd > 0`

```bash
npx siesa-queue db "SELECT state, attempts FROM jobs"
npx siesa-queue db "SELECT model_used, cost_usd FROM cost_ledger"
npx siesa-queue db "SELECT event FROM events ORDER BY id"
```

### T-10: Shutdown limpio con Ctrl+C (CA #7)

```bash
# Con un job en ejecución largo
npx siesa-queue start --foreground &
sleep 3
kill -INT $!     # equivalente a Ctrl+C
```

**Verificar:**
- [ ] Daemon completa el tick en curso
- [ ] Si había Worker activo: job vuelve a `pending` (no queda en `running`)
- [ ] Exit code 0

```bash
npx siesa-queue db "SELECT state FROM jobs WHERE state='running'"
# Debe retornar 0 filas
```

---

## 5. BLOQUE 3 — Ejecución en Background Desatendida (CASO PRINCIPAL)

### T-11: Lanzar daemon en background (`--detach`)

```bash
# Preparar cola
npx siesa-queue init
npx siesa-queue add --from-sprint-status

# Lanzar en background
npx siesa-queue start --detach
echo "Daemon lanzado, cierra esta terminal si quieres"
```

**Verificar lanzamiento:**
- [ ] Output: `Dispatcher started (pid XXXX)` + ruta de logs
- [ ] `siesa-queue health` retorna `ok (heartbeat Xs ago, pid=XXXX)` en los próximos 30s

```bash
npx siesa-queue health
```

### T-12: Monitoreo del daemon en background

```bash
# En otra terminal (o después de re-abrir):
npx siesa-queue status          # snapshot ejecutivo
npx siesa-queue logs --follow   # streaming de NDJSON en tiempo real
npx siesa-queue list            # estado de todos los jobs
```

**Verificar:**
- [ ] `status` muestra conteo de jobs por estado, costo hoy, heartbeat age < 60s
- [ ] `logs --follow` muestra nuevas líneas conforme el daemon procesa
- [ ] `list` muestra los jobs con su estado actualizado

### T-13: Sobrevivir cierre de terminal

```bash
# En terminal A:
npx siesa-queue start --detach

# Cerrar la terminal A completamente (no solo la pestaña de tmux)
# Abrir nueva terminal B:
npx siesa-queue health
npx siesa-queue status
```

**Verificar:**
- [ ] `health` retorna `ok` con heartbeat reciente (daemon sigue vivo)
- [ ] `status` muestra jobs procesándose o completados
- [ ] El proceso está en lista de procesos: `ps aux | grep dispatcher`

### T-14: Flujo completo desatendido — historia BMAD end-to-end

```bash
# Preparar: limpiar DB y agregar UNA historia completa
npx siesa-queue init
npx siesa-queue add --type create-story --story 1-1 --epic 1
npx siesa-queue add --type dev-story --story 1-1 --epic 1
npx siesa-queue add --type code-review --story 1-1 --epic 1

npx siesa-queue list   # Ver 3 jobs pending, misma correlation_key

# Lanzar en background
npx siesa-queue start --detach

# Ir a hacer otra cosa...
# Verificar después:
npx siesa-queue status
npx siesa-queue list
```

**Verificar:**
- [ ] Los 3 jobs se ejecutan en orden secuencial (misma `correlation_key` previene concurrencia)
- [ ] `create-story` primero → `succeeded`, luego `dev-story` → `succeeded`, luego `code-review` → `succeeded`
- [ ] Nunca hay 2 jobs de `story-1-1` en `running` simultáneamente
- [ ] El costo total se muestra en `queue status`

```bash
npx siesa-queue db \
  "SELECT type, state, attempts FROM jobs WHERE correlation_key='story-1-1'"
```

---

## 6. BLOQUE 4 — Rate-Limit: Detección y Recuperación (CA #4, #5, #6, #14)

### T-15: Simular rate-limit con mock de claude

```bash
# Crear script mock que simula un rate-limit de plan_exhaustion
cat > /tmp/mock-claude.sh << 'EOF'
#!/bin/bash
# Simula un rate-limit con epoch de reset en 10 segundos desde ahora
RESET_TS=$(($(date +%s) + 10))
echo "{\"type\":\"result\",\"subtype\":\"success\",\"is_error\":true,\"result\":\"Claude usage limit reached, resets at ${RESET_TS}\",\"usage\":{\"input_tokens\":100,\"output_tokens\":10}}"
EOF
chmod +x /tmp/mock-claude.sh

# Forzar el uso del mock
export SIESA_CLAUDE_BIN=/tmp/mock-claude.sh

# Agregar job de prueba
npx siesa-queue add --custom \
  --prompt "Test rate limit" --unsafe --model haiku

# Ejecutar en foreground para observar
npx siesa-queue start --foreground --verbose
```

**Verificar (esperar ~5 segundos):**
- [ ] Log muestra `rate_limit.detected` con `category=plan_exhaustion`
- [ ] Job pasa a `waiting_rate_limit`
- [ ] `siesa-queue status` muestra `Próximo reset: <fecha local>`
- [ ] Después de 10s: job vuelve a `pending` automáticamente (log: `rate_limit_window_closed`)

```bash
npx siesa-queue list --state waiting_rate_limit   # debe estar vacío después de 10s
npx siesa-queue db \
  "SELECT source, reset_ts, closed_at FROM rate_limit_windows"
```

### T-16: Simular rate-limit transitorio (espera corta ≤ 600s)

```bash
cat > /tmp/mock-claude-short.sh << 'EOF'
#!/bin/bash
RESET_TS=$(($(date +%s) + 5))
echo "{\"type\":\"result\",\"subtype\":\"success\",\"is_error\":true,\"result\":\"Try again in 5 seconds\",\"usage\":{\"input_tokens\":50,\"output_tokens\":5}}"
EOF
chmod +x /tmp/mock-claude-short.sh
export SIESA_CLAUDE_BIN=/tmp/mock-claude-short.sh

npx siesa-queue add --custom --prompt "Test short wait" --unsafe --model haiku
npx siesa-queue start --foreground --verbose
```

**Verificar:**
- [ ] Log muestra `rate_limit_countdown` con `wait_remaining_s` decreciente
- [ ] El Worker mantiene el proceso vivo durante la espera (NO re-spawna claude)
- [ ] Después de ~5s: job pasa a `pending` y se re-intenta

### T-17: Patrón `try_again_in` con extracción de duración

```bash
cat > /tmp/mock-claude-duration.sh << 'EOF'
#!/bin/bash
echo "{\"type\":\"result\",\"subtype\":\"success\",\"is_error\":true,\"result\":\"The API is temporarily limiting your requests. Try again in 2 minutes.\",\"usage\":{\"input_tokens\":50,\"output_tokens\":5}}"
EOF
chmod +x /tmp/mock-claude-duration.sh
export SIESA_CLAUDE_BIN=/tmp/mock-claude-duration.sh

npx siesa-queue add --custom --prompt "Test duration pattern" --unsafe --model haiku
npx siesa-queue start --foreground --verbose 2>&1 | head -30
```

**Verificar:**
- [ ] `reset_ts` calculado como `now + 120` (2 minutos = 120 segundos)
- [ ] Job pasa a `waiting_rate_limit` con `not_before_ts ≈ now + 120`

```bash
npx siesa-queue db \
  "SELECT not_before_ts - strftime('%s','now') AS wait_s FROM jobs WHERE state='waiting_rate_limit'"
# Debe retornar ~120
```

### T-18: Hot-reload de patrones de rate-limit (CA #4)

```bash
# Con daemon corriendo:
npx siesa-queue config reload-patterns
```

**Verificar:**
- [ ] Log del daemon muestra `patterns_reloaded`
- [ ] Sin reiniciar el daemon

### T-19: Visualización de zona horaria correcta (CA #14)

```bash
npx siesa-queue status
```

**Verificar:**
- [ ] Campo `Próximo reset` muestra fecha/hora en TZ local del sistema operativo
- [ ] Internamente en DB el `reset_ts` está en epoch UTC (segundos)

```bash
npx siesa-queue db \
  "SELECT datetime(not_before_ts, 'unixepoch', 'localtime') FROM jobs WHERE state='waiting_rate_limit'"
```

---

## 7. BLOQUE 5 — Crash Recovery y Robustez (CA #6, #7, #12)

### T-20: Recuperación de daemon con `kill -9`

```bash
# Paso 1: Lanzar daemon y esperar a que empiece a procesar un job
npx siesa-queue add --custom --prompt "Test kill recovery" --unsafe --model haiku
npx siesa-queue start --foreground &
DAEMON_PID=$!
sleep 3    # Esperar a que reclame el job

# Paso 2: Matar el daemon brutalmente
kill -9 $DAEMON_PID
sleep 1

# Paso 3: Ver estado del job (debe estar en claimed o running)
npx siesa-queue db "SELECT id, state, attempts FROM jobs"

# Paso 4: Re-lanzar el daemon
npx siesa-queue start --foreground --verbose
# Daemon debe detectar orphans al inicio
```

**Verificar en el output de re-lanzamiento:**
- [ ] Log: `orphans_rescued` con `count=1`
- [ ] Log: `orphan_rescued` con `previous_state=claimed/running`
- [ ] Job vuelve a `pending` con `attempts` incrementado
- [ ] Job NO se re-spawnea en el mismo ciclo de arranque
- [ ] En el siguiente tick: job se re-ejecuta normalmente

```bash
npx siesa-queue db \
  "SELECT state, attempts, last_error FROM jobs ORDER BY id DESC LIMIT 1"
# last_error = 'daemon_restart', attempts = 2 (o más)
```

### T-21: Idempotencia tras crash — sin duplicar efectos en git

```bash
# Correr un dev-story real (con claude real), matarlo a mitad
npx siesa-queue add --type dev-story --story X-Y --epic N
npx siesa-queue start --foreground &
DAEMON_PID=$!
sleep 15  # Dejar que avance
kill -9 $DAEMON_PID

# Verificar que no hay cambios incompletos en git
git status
git diff --name-only HEAD

# Re-lanzar
npx siesa-queue start --foreground
```

**Verificar:**
- [ ] El job reanuda desde cero (no duplica archivos ni commits)
- [ ] Si había un commit parcial, el dev-story lo detecta y no duplica trabajo

### T-22: Resistencia a suspensión del SO (CA #7, #18)

```bash
# Con jobs en vuelo:
npx siesa-queue start --detach
npx siesa-queue add --custom --prompt "Tarea larga" --unsafe

# Linux:
sudo systemctl suspend
# (después de reactivar el equipo)

npx siesa-queue health    # debe mostrar ok (o heartbeat stale si fue demasiado tiempo)
npx siesa-queue status
```

**Verificar:**
- [ ] Si el wake-lock estaba activo: el sistema NO suspende durante `in_flight > 0`
- [ ] Si sí suspendió: al reactivar, el daemon reanuda (heartbeat se recupera)
- [ ] Jobs no quedaron en estado inconsistente (orphan rescue los recupera)

### T-23: Watchdog — daemon bloqueado (CA #6)

```bash
# Verificar que el watchdog detecta daemon stale
# (Simular mediante heartbeat artificial)
PID=$(npx siesa-queue status --json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('heartbeat_age_s',''))" 2>/dev/null)

# Ejecutar health check
npx siesa-queue health
# Debe retornar 'ok' si daemon activo, exit 2 si stale

# Ejecutar watchdog directamente
node ~/.siesa-queue/runtime/watchdog.js
```

**Verificar:**
- [ ] `queue health` retorna `ok` con heartbeat < 180s cuando daemon activo
- [ ] `queue health` retorna exit 2 si heartbeat > 180s

---

## 8. BLOQUE 6 — Sesiones y Contexto (CA #8)

### T-24: Reutilización de session_id por correlation_key

```bash
# Agregar 3 jobs de la misma historia (misma correlation_key)
npx siesa-queue add --type create-story --story 2-1 --epic 2
npx siesa-queue add --type dev-story    --story 2-1 --epic 2
npx siesa-queue add --type code-review  --story 2-1 --epic 2

# Ejecutar
npx siesa-queue start --foreground &
sleep 60

# Verificar sesiones
npx siesa-queue db \
  "SELECT s.correlation_key, s.session_id, s.invocations
   FROM sessions s ORDER BY created_at"
```

**Verificar:**
- [ ] Los 3 jobs usaron el **mismo** `session_id` (misma `correlation_key = story-2-1`)
- [ ] `invocations = 3` en la sesión de `story-2-1`

```bash
npx siesa-queue db \
  "SELECT r.attempt_number, r.session_id, j.type
   FROM runs r JOIN jobs j ON r.job_id=j.id
   WHERE j.correlation_key='story-2-1'
   ORDER BY r.started_at"
# Los 3 runs deben tener el mismo session_id
```

### T-25: Aislamiento de sesiones entre historias diferentes

```bash
npx siesa-queue db \
  "SELECT correlation_key, session_id FROM sessions"
```

**Verificar:**
- [ ] Cada `correlation_key` diferente tiene su propio `session_id` único

### T-26: Sesiones — GC manual

```bash
npx siesa-queue sessions prune --older-than 0d   # Para testing: marcar todas como abandoned
```

**Verificar:**
- [ ] Muestra cuántas se van a marcar antes de confirmar
- [ ] Pide confirmación
- [ ] Marca `abandoned=1` sin borrar filas

```bash
npx siesa-queue db \
  "SELECT COUNT(*) FROM sessions WHERE abandoned=1"
```

---

## 9. BLOQUE 7 — Costos y Modelos (CA #10, #17)

### T-27: Selección de modelo por tipo de job

```bash
# Verificar que model-policy.json se aplica
npx siesa-queue add --type code-review --story 3-1 --epic 3   # debe usar haiku (policy default)
npx siesa-queue add --type dev-story   --story 3-2 --epic 3   # debe usar sonnet
npx siesa-queue add --type code-review --story 3-3 --epic 3 --model opus  # override manual

npx siesa-queue db \
  "SELECT type, model_override FROM jobs ORDER BY id DESC LIMIT 3"
```

**Verificar (después de ejecutar):**
- [ ] `code-review` sin override usa el modelo de `policy.by_type.code-review` (haiku)
- [ ] `dev-story` usa `policy.by_type.dev-story` (sonnet)
- [ ] Job con `--model opus` usa opus (override manual tiene precedencia)

```bash
npx siesa-queue db \
  "SELECT j.type, r.model_used FROM runs r JOIN jobs j ON r.job_id=j.id ORDER BY r.id DESC LIMIT 3"
```

### T-28: Costo registrado en cost_ledger (CA #17)

```bash
npx siesa-queue status
```

**Verificar:**
- [ ] Tabla "Costo Hoy" muestra desglose por modelo (haiku vs sonnet)
- [ ] Suma total acumulada visible

```bash
npx siesa-queue db \
  "SELECT model, SUM(input_tokens) as inp, SUM(output_tokens) as out, SUM(cost_usd) as cost
   FROM cost_ledger GROUP BY model"
```

### T-29: Duración registrada por run (CA #17)

```bash
npx siesa-queue db \
  "SELECT j.type, r.duration_ms, r.model_used FROM runs r JOIN jobs j ON r.job_id=j.id"
```

**Verificar:**
- [ ] `duration_ms` > 0 para todos los runs completados
- [ ] Valores razonables según el tipo de job

### T-30: `queue status --json` (CA #17)

```bash
npx siesa-queue status --json | python3 -m json.tool
```

**Verificar que el JSON tiene:**
- [ ] `jobs_by_state` (diccionario estado → count)
- [ ] `cost_today` (diccionario modelo → cost_usd)
- [ ] `grand_total` (float)
- [ ] `next_reset_ts` (epoch o null)
- [ ] `heartbeat_age_s` (segundos o null)

### T-31: Presupuesto diario (CA #10)

```bash
# Configurar un presupuesto muy bajo para forzar el corte
# Editar ~/.siesa-queue/model-policy.json:
# "daily_budget_usd": 0.001   (1 milésima de dólar)

# Re-lanzar daemon y agregar jobs
npx siesa-queue start --foreground --verbose

# Después de que el daemon gaste > 0.001 USD:
```

**Verificar:**
- [ ] Log: `budget.exceeded` con `daily_spent` y `limit`
- [ ] Daemon entra en modo `paused`: no reclama nuevos jobs
- [ ] Heartbeat sigue latiendo (responde a `queue health`)

```bash
npx siesa-queue health                           # debe retornar ok
npx siesa-queue status                           # debe mostrar jobs en pending (no running)
npx siesa-queue config set paused false          # desbloquear manualmente
```

---

## 10. BLOQUE 8 — Control Operativo (CA #1, #11)

### T-32: `queue retry` — forzar re-ejecución

```bash
# Tomar un job que falló o quedó en waiting_rate_limit
JOB_ID=$(npx siesa-queue db \
  "SELECT id FROM jobs WHERE state='failed' LIMIT 1")

npx siesa-queue retry $JOB_ID
npx siesa-queue list --state pending
```

**Verificar:**
- [ ] Job vuelve a `state=pending` con `attempts=0`, `not_before_ts=0`
- [ ] Reaparece en el tick del dispatcher

### T-33: `queue cancel` — cancelar job activo

```bash
# Con un job en running:
JOB_ID=$(npx siesa-queue db \
  "SELECT id FROM jobs WHERE state='running' LIMIT 1")
npx siesa-queue cancel $JOB_ID
```

**Verificar:**
- [ ] Job pasa a `cancelled`
- [ ] Worker del job recibe señal de terminación

### T-34: `queue pause` y `queue resume` (CA #11)

```bash
npx siesa-queue pause
npx siesa-queue status   # daemon activo pero no reclama jobs
npx siesa-queue list     # jobs siguen en pending

npx siesa-queue resume
npx siesa-queue status   # reanuda procesamiento en el próximo tick
```

**Verificar:**
- [ ] Durante `pause`: `queue health` retorna ok (daemon sigue vivo)
- [ ] Ningún nuevo job pasa a `claimed` mientras está pausado
- [ ] Tras `resume`: retoma en el siguiente tick (< 5 segundos)

### T-35: Concurrencia — verificar que no se ejecutan 2 jobs con misma correlation_key

```bash
# Con concurrency=1 (default):
npx siesa-queue add --type create-story --story 5-1 --epic 5
npx siesa-queue add --type dev-story    --story 5-1 --epic 5

# Ambos tienen correlation_key='story-5-1'
# Lanzar daemon y verificar que NUNCA hay 2 en running al mismo tiempo:
npx siesa-queue start --foreground &

# Verificar periódicamente durante la ejecución:
while sleep 2; do
  npx siesa-queue db \
    "SELECT state, type FROM jobs WHERE correlation_key='story-5-1'"
  echo "---"
done
```

**Verificar:**
- [ ] Nunca hay dos jobs de `story-5-1` en estado `claimed` o `running` simultáneamente
- [ ] Después de que `create-story` termine, `dev-story` empieza

---

## 11. BLOQUE 9 — Wake-Lock (CA #18)

### T-36: Verificar que wake-lock está activo

```bash
# Linux:
npx siesa-queue start --detach
npx siesa-queue add --custom --prompt "tarea larga" --unsafe

# Verificar proceso de wake-lock:
ps aux | grep "systemd-inhibit\|caffeinate"

# Verificar inhibidores activos:
systemd-inhibit --list    # (Linux)
# En macOS: pmset -g assertions | grep caffeinate
```

**Verificar:**
- [ ] Proceso `systemd-inhibit` activo mientras hay jobs en `in_flight > 0`
- [ ] Proceso muere cuando `in_flight` baja a 0

### T-37: Wake-lock desactivado con variable de entorno

```bash
SIESA_QUEUE_WAKE_LOCK=never npx siesa-queue start --foreground --verbose
```

**Verificar:**
- [ ] NO se lanza proceso `systemd-inhibit` / `caffeinate`
- [ ] El resto del daemon funciona normalmente

---

## 12. BLOQUE 10 — Servicio del SO (CA #15) — Opcional

> Solo ejecutar si el developer quiere que el queue sobreviva reboots.

### T-38: Instalar y verificar servicio en Linux

```bash
npx siesa-queue install-service --wake-lock

# Verificar archivos generados:
cat ~/.config/systemd/user/siesa-queue.service
crontab -l | grep watchdog

# Verificar estado:
systemctl --user status siesa-queue
```

**Verificar:**
- [ ] Servicio activo (`active (running)`)
- [ ] `siesa-queue health` retorna ok

```bash
# Simular reboot (solo el servicio):
systemctl --user restart siesa-queue
sleep 5
npx siesa-queue health   # debe volver con heartbeat fresco
```

### T-39: Desinstalar servicio

```bash
npx siesa-queue uninstall-service

# Verificar:
systemctl --user status siesa-queue 2>&1 | grep -c "not found"   # debe ser 1
crontab -l | grep -c watchdog   # debe ser 0
```

---

## 13. BLOQUE 11 — Observabilidad (CA #16)

### T-40: Estructura NDJSON de los logs

```bash
cat ~/.siesa-queue/logs/queue-$(date +%Y-%m-%d).ndjson | head -20 | python3 -m json.tool
```

**Verificar que cada línea tiene:**
- [ ] `ts` (timestamp ISO o epoch)
- [ ] `level` (info/warn/error/debug)
- [ ] `event` (string identificador del evento)
- [ ] `job_id` cuando aplica

### T-41: `queue logs --follow`

```bash
npx siesa-queue logs --follow
# En otra terminal: agregar un job y arrancar daemon
npx siesa-queue add --custom --prompt "Test observability" --unsafe
```

**Verificar:**
- [ ] Las líneas aparecen en tiempo real conforme el daemon procesa
- [ ] Formato es NDJSON parseable

### T-42: Filtro de logs por job

```bash
JOB_ID=1
npx siesa-queue logs --job $JOB_ID
```

**Verificar:**
- [ ] Solo aparecen eventos del job especificado

### T-43: Rotación de logs

```bash
ls -la ~/.siesa-queue/logs/
```

**Verificar:**
- [ ] Archivo `queue-YYYY-MM-DD.ndjson` del día actual
- [ ] Si hay logs de días anteriores: archivos `.gz` comprimidos

---

## 14. BLOQUE 12 — Migración de DB (CA #9)

### T-44: `queue migrate`

```bash
# Verificar versión actual
npx siesa-queue db "PRAGMA user_version"   # debe ser 4

# Ejecutar migrate (debe ser no-op si ya está actualizada)
npx siesa-queue migrate
```

**Verificar:**
- [ ] No hay error
- [ ] Si ya está en la versión más reciente: "No hay migraciones pendientes" o similar

---

## 15. Matriz de Verificación — Criterios de Aceptación

| # | Criterio de Aceptación | Test(s) | Estado |
|---|---|---|---|
| CA #1 | Orquestar ejecución desatendida | T-09, T-11, T-13, T-14 | |
| CA #2 | Cola heterogénea (create, dev, review, custom) | T-03, T-05, T-07 | |
| CA #3 | Capturar salida estructurada JSON del stream | T-09 (eventos en DB) | |
| CA #4 | Detectar éxito vs rate-limit | T-15, T-16, T-17 | |
| CA #5 | Tiempo restante con countdown activo | T-16 (espera corta), T-15 (espera larga) | |
| CA #6 | Reanudar tras corte sin intervención | T-15 (auto-resume), T-20, T-23 | |
| CA #7 | Resistencia a reinicios/suspensión/red | T-10, T-20, T-22 | |
| CA #8 | Reutilizar session_id por correlation_key | T-24, T-25 | |
| CA #9 | Cola persistente con estados explícitos | T-01, T-03, T-44 (schema WAL) | |
| CA #10 | Gestión de costos y selección de modelo | T-27, T-28, T-31 | |
| CA #11 | Controlar concurrencia (semáforo + SQL) | T-34, T-35 | |
| CA #12 | Idempotencia en tareas reanudadas | T-04, T-06, T-21 | |
| CA #13 | Límite máximo de reintentos | T-20 (attempts >= max_retries → failed) | |
| CA #14 | Manejo de zonas horarias en reset_ts | T-19 | |
| CA #15 | Daemon resiliente cross-OS | T-38 (Linux), T-11 + T-13 (cualquier OS) | |
| CA #16 | Logs NDJSON estructurados para auditoría | T-40, T-41, T-42, T-43 | |
| CA #17 | Consumo y duración por iteración | T-28, T-29, T-30 | |
| CA #18 | Wake-lock mientras operación activa | T-36, T-37 | |

---

## 16. Escenario Completo — Sprint Desatendido de Noche

Este es el escenario "de producción" que junta todo. Simula lo que hace un developer que quiere dejar un sprint corriendo hasta el día siguiente.

```bash
# === Preparación (tardes, antes de salir) ===

# 1. Posicionarse en el proyecto BMAD
cd ~/mi-proyecto-bmad
npx siesa-agents@latest      # actualizar siesa-agents si hay nueva versión

# 2. Inicializar (solo primera vez o si se limpió la DB)
npx siesa-queue init

# 3. Importar el sprint actual (modo épica recomendado: 1 job por épica)
npx siesa-queue add --from-epics
npx siesa-queue list --state pending    # revisar qué se va a ejecutar

# 4. (Opcional) Agregar dependencias explícitas entre épicas
npx siesa-queue add --type quick-dev --epic 3 --depends-on-epics 1   # épica 3 espera que épica 1 termine

# 5. Lanzar en background
npx siesa-queue start --detach
# Output esperado: Dispatcher started (pid XXXX) / Logs: ~/.siesa-queue/daemon.log

# 6. Verificar que arrancó
sleep 5 && npx siesa-queue health
# Output esperado: ok (heartbeat Xs ago, pid=XXXX)

# 7. Salir / cerrar terminal / irse a dormir

# === Verificación al día siguiente ===

npx siesa-queue status          # Ver resumen: jobs completados, costo total
npx siesa-queue list            # Ver estado por job
npx siesa-queue logs --follow   # Si algo está en curso, seguirlo en vivo
```

**Qué esperar al regresar:**
- Jobs `succeeded`: el sprint avanzó automáticamente
- Jobs `failed` con `attempts >= max_retries`: requieren revisión manual (`queue retry <id>`)
- Jobs `waiting_rate_limit`: el rate-limit aún no se resolvió (usar `queue retry <id>` para forzar)
- Jobs en `pending` o `running`: el daemon sigue trabajando

---

## 17. Diagnóstico Rápido

### El daemon no responde

```bash
npx siesa-queue health             # ver exit code y mensaje
ps aux | grep dispatcher       # ¿está el proceso corriendo?
tail -50 ~/.siesa-queue/logs/stderr.log   # ver errores
tail -50 ~/.siesa-queue/daemon.log        # si se lanzó con --detach

# Forzar re-lanzamiento
npx siesa-queue start --detach
```

### Jobs atascados en `waiting_rate_limit`

```bash
npx siesa-queue list --state waiting_rate_limit
npx siesa-queue db \
  "SELECT id, not_before_ts - strftime('%s','now') AS wait_s FROM jobs WHERE state='waiting_rate_limit'"

# Si el tiempo de espera ya pasó pero sigue en ese estado: forzar
npx siesa-queue retry <id>

# Si se sospecha falso positivo en patrones:
npx siesa-queue config reload-patterns
```

### Jobs en `failed` (reintentos agotados)

```bash
npx siesa-queue db \
  "SELECT id, type, attempts, max_retries, last_error FROM jobs WHERE state='failed'"

# Investigar el log del último run
RUN_ID=$(npx siesa-queue db \
  "SELECT id FROM runs WHERE job_id=<ID> ORDER BY started_at DESC LIMIT 1")
npx siesa-queue db \
  "SELECT event, payload FROM events WHERE run_id=$RUN_ID ORDER BY ts"

# Si el error es recuperable, resetear y reintentar
npx siesa-queue retry <id>
```

### Costo inesperadamente alto

```bash
npx siesa-queue status     # ver desglose por modelo
npx siesa-queue db \
  "SELECT date(ts,'unixepoch') as day, model, SUM(cost_usd) as cost
   FROM cost_ledger GROUP BY day, model ORDER BY day DESC"

# Activar presupuesto diario (en ~/.siesa-queue/model-policy.json):
# "daily_budget_usd": 5.00
npx siesa-queue start --detach   # reiniciar daemon para que cargue el nuevo policy
```

---

## 18. Checklist de Verificación por Fase

### Fase 0 — Scaffolding
- [ ] T-01: `queue init` crea estructura y DB
- [ ] T-02: Doble `init` es idempotente
- [ ] T-03: `queue add` inserta job
- [ ] T-04: Doble `add` mismo job → idempotente
- [ ] T-05a: `add --from-epics` importa épicas como jobs quick-dev
- [ ] T-05b: `add --type quick-dev --depends-on-epics` agrega dependencia
- [ ] T-05c: `add --from-sprint-status` (legacy) importa solo ready-for-dev/in-progress
- [ ] T-06: Doble importación → 0 jobs nuevos
- [ ] T-44: `queue migrate` funciona

### Fase 1 — Dispatcher + Worker
- [ ] T-09: Smoke test job completo hasta `succeeded`
- [ ] T-10: Shutdown limpio con Ctrl+C
- [ ] T-11: `--detach` lanza daemon en background
- [ ] T-12: Monitoreo con `status` y `logs`
- [ ] T-13: Daemon sobrevive cierre de terminal

### Fase 2 — Rate-limit + Retry + Crash Recovery
- [ ] T-15: Rate-limit detectado → `waiting_rate_limit` → auto-resume
- [ ] T-16: Espera corta ≤ 600s → countdown in-process
- [ ] T-17: Patrón `try_again_in` extrae duración correctamente
- [ ] T-20: Crash recovery con `kill -9` → orphan rescue
- [ ] T-21: Sin duplicación de efectos en git tras crash

### Fase 3 — Sessions + Cost
- [ ] T-24: Misma `correlation_key` reutiliza `session_id`
- [ ] T-27: Selección de modelo por tipo respeta `model-policy.json`
- [ ] T-28: Costo registrado en `cost_ledger`
- [ ] T-30: `queue status --json` con desglose completo

### Fase 4 — Multi-OS service + wake-lock
- [ ] T-36: Wake-lock activo con `in_flight > 0`
- [ ] T-37: `SIESA_QUEUE_WAKE_LOCK=never` desactiva wake-lock
- [ ] T-38: `install-service` instala daemon en systemd/launchd/Task Scheduler (opcional)

### Fase 5 — Telemetría + Presupuesto
- [ ] T-31: Presupuesto diario auto-pausa y alerta
- [ ] T-34: `queue pause` / `queue resume` opera correctamente

### Fase 6 — Concurrencia
- [ ] T-35: Con concurrency=1: misma correlation_key nunca en paralelo

### Escenario Completo
- [ ] T-14: Flujo create-story → dev-story → code-review desatendido end-to-end
- [ ] Escenario §16: Sprint completo overnight
