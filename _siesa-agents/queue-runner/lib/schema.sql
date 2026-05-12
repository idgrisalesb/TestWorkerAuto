PRAGMA journal_mode = WAL;
PRAGMA synchronous  = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA user_version = 4;

CREATE TABLE IF NOT EXISTS jobs (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    type               TEXT NOT NULL,                 -- create-story | dev-story | code-review | custom
    state              TEXT NOT NULL DEFAULT 'pending',
    priority           INTEGER NOT NULL DEFAULT 100,  -- menor = antes
    correlation_key    TEXT,                          -- "epic-1", "story-1-1", etc.
    payload_json       TEXT NOT NULL,                 -- {story_id, prompt, allowedTools, ...}
    input_fingerprint  TEXT NOT NULL,                 -- sha256(payload normalizado) para idempotencia
    model_override     TEXT,                          -- haiku | sonnet | opus | NULL
    max_retries        INTEGER NOT NULL DEFAULT 8,
    attempts           INTEGER NOT NULL DEFAULT 0,
    not_before_ts      INTEGER NOT NULL DEFAULT 0,    -- epoch s; rate-limit "no antes de"
    last_error         TEXT,
    created_at         INTEGER NOT NULL,
    updated_at         INTEGER NOT NULL,
    UNIQUE(input_fingerprint)
);
CREATE INDEX IF NOT EXISTS idx_jobs_state_priority ON jobs(state, priority, not_before_ts, id);
CREATE INDEX IF NOT EXISTS idx_jobs_corr           ON jobs(correlation_key);

CREATE TABLE IF NOT EXISTS runs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id          INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    attempt_number  INTEGER NOT NULL,
    session_id      TEXT,                              -- UUID pasado a --session-id
    model_used      TEXT,
    pid             INTEGER,
    started_at      INTEGER NOT NULL,
    finished_at     INTEGER,
    duration_ms     INTEGER,
    is_error        INTEGER,                           -- 0/1
    exit_code       INTEGER,
    rate_limited    INTEGER NOT NULL DEFAULT 0,        -- 0/1
    result_text     TEXT,                              -- result.result truncado
    raw_log_path    TEXT
);
CREATE INDEX IF NOT EXISTS idx_runs_job ON runs(job_id);

CREATE TABLE IF NOT EXISTS events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id      INTEGER REFERENCES runs(id) ON DELETE CASCADE,
    job_id      INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    ts          INTEGER NOT NULL,
    level       TEXT NOT NULL,                         -- info|warn|error|debug
    event       TEXT NOT NULL,                         -- claim|spawn|stream|rate_limit|wait|resume|finish|...
    payload     TEXT                                   -- JSON libre
);
CREATE INDEX IF NOT EXISTS idx_events_job_ts ON events(job_id, ts);

CREATE TABLE IF NOT EXISTS sessions (
    correlation_key  TEXT PRIMARY KEY,
    session_id       TEXT NOT NULL,
    created_at       INTEGER NOT NULL,
    last_used_at     INTEGER NOT NULL,
    invocations      INTEGER NOT NULL DEFAULT 0,
    abandoned        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cost_ledger (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id           INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    run_id           INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    ts               INTEGER NOT NULL,
    model            TEXT NOT NULL,
    input_tokens     INTEGER NOT NULL DEFAULT 0,
    output_tokens    INTEGER NOT NULL DEFAULT 0,
    cache_read       INTEGER NOT NULL DEFAULT 0,
    cache_create     INTEGER NOT NULL DEFAULT 0,
    cost_usd         REAL    NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_cost_job ON cost_ledger(job_id);

CREATE TABLE IF NOT EXISTS rate_limit_windows (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    detected_at     INTEGER NOT NULL,
    reset_ts        INTEGER NOT NULL,                  -- epoch s estimado de reapertura
    source          TEXT NOT NULL,                     -- regex_match | rate_limit_event | http_429 | billing_block
    pattern_matched TEXT,
    raw_excerpt     TEXT,
    closed_at       INTEGER,
    job_id          INTEGER REFERENCES jobs(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_rl_open ON rate_limit_windows(closed_at, reset_ts);
CREATE INDEX IF NOT EXISTS idx_rl_job  ON rate_limit_windows(job_id);

CREATE TABLE IF NOT EXISTS daemon_heartbeat (
    id              INTEGER PRIMARY KEY CHECK (id = 1),
    pid             INTEGER NOT NULL,
    host            TEXT NOT NULL,
    started_at      INTEGER NOT NULL,
    last_beat_ts    INTEGER NOT NULL,
    in_flight       INTEGER NOT NULL DEFAULT 0,
    version         TEXT
);

CREATE TABLE IF NOT EXISTS daemon_config (
    id               INTEGER PRIMARY KEY CHECK (id = 1),
    paused           INTEGER NOT NULL DEFAULT 0,      -- 0/1
    paused_by_budget INTEGER NOT NULL DEFAULT 0,      -- 0=manual, 1=budget auto-pause
    concurrency      INTEGER NOT NULL DEFAULT 1,      -- max parallel Workers (story 1.6)
    updated_at       INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO daemon_config (id, paused, paused_by_budget, concurrency, updated_at)
VALUES (1, 0, 0, 1, 0);
