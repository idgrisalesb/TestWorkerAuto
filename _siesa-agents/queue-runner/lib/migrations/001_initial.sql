-- Migration 001: Initial schema
-- This migration creates all base tables for the Sentinel Queue feature.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS jobs (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    type               TEXT NOT NULL,
    state              TEXT NOT NULL DEFAULT 'pending',
    priority           INTEGER NOT NULL DEFAULT 100,
    correlation_key    TEXT,
    payload_json       TEXT NOT NULL,
    input_fingerprint  TEXT NOT NULL,
    model_override     TEXT,
    max_retries        INTEGER NOT NULL DEFAULT 8,
    attempts           INTEGER NOT NULL DEFAULT 0,
    not_before_ts      INTEGER NOT NULL DEFAULT 0,
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
    session_id      TEXT,
    model_used      TEXT,
    pid             INTEGER,
    started_at      INTEGER NOT NULL,
    finished_at     INTEGER,
    duration_ms     INTEGER,
    is_error        INTEGER,
    exit_code       INTEGER,
    rate_limited    INTEGER NOT NULL DEFAULT 0,
    result_text     TEXT,
    raw_log_path    TEXT
);
CREATE INDEX IF NOT EXISTS idx_runs_job ON runs(job_id);

CREATE TABLE IF NOT EXISTS events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id      INTEGER REFERENCES runs(id) ON DELETE CASCADE,
    job_id      INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    ts          INTEGER NOT NULL,
    level       TEXT NOT NULL,
    event       TEXT NOT NULL,
    payload     TEXT
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
    reset_ts        INTEGER NOT NULL,
    source          TEXT NOT NULL,
    pattern_matched TEXT,
    raw_excerpt     TEXT,
    closed_at       INTEGER
);
CREATE INDEX IF NOT EXISTS idx_rl_open ON rate_limit_windows(closed_at, reset_ts);

CREATE TABLE IF NOT EXISTS daemon_heartbeat (
    id              INTEGER PRIMARY KEY CHECK (id = 1),
    pid             INTEGER NOT NULL,
    host            TEXT NOT NULL,
    started_at      INTEGER NOT NULL,
    last_beat_ts    INTEGER NOT NULL,
    in_flight       INTEGER NOT NULL DEFAULT 0,
    version         TEXT
);

PRAGMA user_version = 1;
