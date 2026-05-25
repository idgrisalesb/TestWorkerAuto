# Queue-Runner: Qué es y cómo funciona

---

## La idea en una frase

> Es un **mayordomo automático** que toma trabajos de programación (crear historias, implementar código, revisar código), los pone en una lista de espera, y los va ejecutando uno por uno usando Claude AI — sin que nadie tenga que estar mirando.

---

## Analogía: La lavandería automática

Imagina una **lavandería con máquinas automáticas**:

| Lavandería | Queue-Runner |
|---|---|
| El cliente deja su ropa | El desarrollador agrega un "job" |
| La lista de turnos | La base de datos SQLite (cola) |
| La máquina lavadora | El Worker (ejecuta Claude) |
| El encargado que asigna turnos | El Dispatcher (cerebro del sistema) |
| "Fuera de servicio, vuelve en 1 hora" | Rate-limit de Claude API |
| La ropa ya lista | Job en estado `succeeded` |

---

## Los 3 conceptos clave

### 1. El Job (trabajo)

Un job es una tarea que quieres que Claude haga. Tiene:

- **Tipo**: `create-story`, `dev-story`, `code-review`, o algo personalizado
- **Estado**: `pending → running → succeeded` (o `failed` si algo sale mal)
- **Correlation key**: un identificador que agrupa los 3 pasos de una historia (crear → implementar → revisar)

### 2. El Dispatcher (el cerebro)

Es un proceso que corre en segundo plano (daemon) y cada **5 segundos** hace:

1. ¿Hay jobs esperando? → Toma el siguiente
2. ¿Llegué al límite de trabajos simultáneos? → Espera
3. ¿El API de Claude está bloqueado? → Espera hasta que se libere
4. ¿Se excedió el presupuesto del día? → Se pausa solo

### 3. El Worker (el ejecutor)

Por cada job, el Dispatcher crea un Worker que:

1. Construye el prompt para Claude
2. Lanza Claude como proceso hijo (`claude --print --output-format stream-json`)
3. Lee la respuesta en tiempo real
4. Detecta si hubo error, rate-limit, o éxito
5. Registra el resultado y el costo en la base de datos

---

## El flujo completo — paso a paso

```
┌─────────────────────────────────────────────────────────┐
│  1. El desarrollador agrega un job                      │
│     siesa-queue add --type dev-story --story 1-1        │
│                          │                              │
│                          ▼                              │
│  2. Se guarda en SQLite con estado "pending"            │
│                          │                              │
│                          ▼                              │
│  3. El Dispatcher (cada 5s) ve el job y lo "reclama"    │
│     estado: pending → claimed                           │
│                          │                              │
│                          ▼                              │
│  4. Se crea un Worker que lanza Claude como proceso     │
│     $ claude --print --model sonnet "implementar..."    │
│     estado: claimed → running                           │
│                          │                              │
│         ┌────────────────┴────────────────┐             │
│         ▼                                 ▼             │
│    Claude termina OK                Rate-limit          │
│         │                                 │             │
│         ▼                                 ▼             │
│   estado: succeeded              ¿Espera corta (<10m)?  │
│                               SI: espera y reintenta    │
│                               NO: estado waiting...     │
│                                   (se reanuda solo)     │
└─────────────────────────────────────────────────────────┘
```

---

## Los estados de un Job

```
pending
   │
   ▼
claimed ──────────────────────────────────────┐
   │                                          │
   ▼                                          │
running                                       │
   │                                          │
   ├──── succeeded  (terminal ✓)              │
   │                                          │
   ├──── failed_attempt ──► (backoff) ──► pending (reintento)
   │          │
   │          └──── failed  (terminal ✗, se agotaron los reintentos)
   │
   └──── waiting_rate_limit ──► (cuando pasa el tiempo) ──► pending
```

---

## El manejo de errores (la parte inteligente)

El sistema tiene **3 niveles de recuperación automática**:

### Nivel 1 — Rate-limit de Claude API

Claude tiene límites de uso por tiempo. Cuando los alcanza, el sistema:

- Detecta el bloqueo por 3 canales (stderr, respuesta JSON, o si Claude reintentó más de 3 veces en 30s)
- Si el bloqueo es **corto** (menos de 10 minutos): espera en el mismo proceso y reintenta automáticamente
- Si es **largo**: deja el job en espera y lo activa solo cuando Claude esté disponible

### Nivel 2 — Fallo del job

Si un job falla, se reintenta automáticamente con **espera exponencial**:

| Intento | Espera antes de reintentar |
|---------|---------------------------|
| 1°      | 1 minuto                  |
| 2°      | 2 minutos                 |
| 3°      | 4 minutos                 |
| 4°      | 8 minutos                 |
| 5°+     | 30 minutos (máximo)       |

Máximo 8 intentos. Si todos fallan, el job queda en estado `failed` para investigación manual.

### Nivel 3 — Si el daemon muere inesperadamente

Al reiniciar, el sistema detecta jobs que quedaron "atrapados" en vuelo (**orphan rescue**) y los vuelve a `pending` automáticamente para que se ejecuten de nuevo.

---

## Estructura de archivos

```
queue-runner/
├── runtime/
│   ├── dispatcher.js   ← El cerebro (daemon principal, loop cada 5s)
│   └── worker.js       ← Ejecuta Claude por cada job
├── lib/
│   ├── db.js           ← Base de datos SQLite (persistencia de la cola)
│   ├── sessions.js     ← Manejo de sesiones de Claude
│   ├── rate-limit.js   ← Detecta y maneja rate-limits
│   ├── cost.js         ← Calcula costo en USD por job
│   └── logger.js       ← Logs en formato NDJSON (rotación diaria)
├── cli/commands/
│   ├── add.js          ← siesa-queue add
│   ├── start.js        ← siesa-queue start
│   ├── status.js       ← siesa-queue status
│   └── logs.js         ← siesa-queue logs
└── config/
    └── rate-limit-patterns.json  ← Patrones para detectar rate-limits
```

---

## Los comandos más usados

```bash
# Inicializar (solo la primera vez)
siesa-queue init

# Agregar todas las épicas del sprint automáticamente
siesa-queue add --from-epics

# Agregar una historia individual
siesa-queue add --type dev-story --story 1-1 --epic 2

# Ver el estado actual
siesa-queue status

# Iniciar el daemon en segundo plano
siesa-queue start --detach

# Ver los logs en tiempo real
siesa-queue logs --follow

# Pausar / reanudar el daemon
siesa-queue pause
siesa-queue resume

# Reintentar un job fallido
siesa-queue retry --job-id 5
```

---

## El sistema de sesiones (contexto de Claude)

Cuando se ejecutan los 3 pasos de una historia (`create → dev → review`), el sistema usa un `correlation_key` (por ejemplo `story-1-1`) para agruparlos.

Cada fase tiene **su propia sesión de Claude** para no mezclar contextos:

```
story-1-1:create-story  →  sesión A  (nueva conversación con Claude)
story-1-1:dev-story     →  sesión B  (nueva conversación con Claude)
story-1-1:code-review   →  sesión C  (nueva conversación con Claude)
```

Esto evita que el contexto de "crear la historia" contamine la sesión de "implementarla".

Si el mismo job se reintenta (por un fallo), Claude **reanuda** la misma sesión usando `--resume`, manteniendo el historial de lo que ya hizo.

---

## El presupuesto diario

El sistema registra automáticamente el costo de cada job en USD según el modelo usado:

| Modelo  | Costo aproximado por millón de tokens |
|---------|---------------------------------------|
| Haiku   | $1 entrada / $5 salida                |
| Sonnet  | $3 entrada / $15 salida               |
| Opus    | $15 entrada / $75 salida              |

Si se configura un límite diario:

- El daemon **se pausa solo** al alcanzarlo
- **Se reanuda solo** al día siguiente (cuando el contador vuelve a cero)

```bash
siesa-queue status  # muestra el costo total del día y el acumulado
```

---

## Observabilidad: los logs

Todos los eventos se guardan en archivos NDJSON (una línea JSON por evento), rotados diariamente:

```
~/.siesa-queue/logs/
  queue-2026-05-12.ndjson       ← hoy
  queue-2026-05-11.ndjson.gz    ← ayer (comprimido)
  queue-2026-05-10.ndjson.gz
  ...
```

Cada línea tiene este formato:

```json
{
  "ts": "2026-05-12T14:30:45.123Z",
  "level": "info",
  "event": "job.claim",
  "job_id": 123,
  "payload": { "type": "dev-story", "story_id": "1-1" }
}
```

Para monitorear en tiempo real:

```bash
siesa-queue logs --follow
```

---

## Diagrama completo del sistema

```
┌────────────────────────────────────────────────────────────────────┐
│                        DESARROLLADOR                               │
│                   siesa-queue add --from-epics                     │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│                      BASE DE DATOS (SQLite)                        │
│  jobs: [pending] [pending] [pending] [waiting_rate_limit]          │
│  sessions, runs, events, cost_ledger                               │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼  (cada 5 segundos)
┌────────────────────────────────────────────────────────────────────┐
│                      DISPATCHER (daemon)                           │
│  - Rescata jobs huérfanos al arrancar                              │
│  - Verifica presupuesto diario                                     │
│  - Reclama el siguiente job "pending"                              │
│  - Lanza un Worker por cada job                                    │
│  - Remueve jobs de rate-limit cuando pasa el tiempo               │
└────────────────────────────┬───────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
         [Worker 1]     [Worker 2]    [Worker N]
              │
              ▼
┌─────────────────────────────┐
│   claude --print \          │
│     --model sonnet \        │
│     --session-id uuid \     │
│     "implementar..."        │
└─────────────┬───────────────┘
              │
    ┌─────────┴──────────┐
    ▼                    ▼
  Exito              Rate-limit / Error
    │                    │
    ▼                    ▼
succeeded         retry / waiting
```

---

## En resumen para alguien nuevo

1. **Tu agregas trabajos** con `siesa-queue add`
2. **El sistema los ejecuta solo** lanzando Claude por cada uno
3. **Si algo falla** reintenta automáticamente con espera progresiva
4. **Si Claude está saturado** espera y sigue solo cuando se libera
5. **Tu solo supervisas** con `siesa-queue status` o `siesa-queue logs --follow`

> Es como dejar una lista de tareas en el escritorio antes de irte a dormir, y cuando despiertas todo está hecho.

---

*Documento generado el 2026-05-12*
