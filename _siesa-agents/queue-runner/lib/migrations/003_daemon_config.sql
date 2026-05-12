-- Migration 003: Add daemon_config table for paused state and daily budget tracking.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS daemon_config (
    id               INTEGER PRIMARY KEY CHECK (id = 1),
    paused           INTEGER NOT NULL DEFAULT 0,      -- 0/1
    paused_by_budget INTEGER NOT NULL DEFAULT 0,      -- 0=manual, 1=budget auto-pause
    updated_at       INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO daemon_config (id, paused, paused_by_budget, updated_at)
VALUES (1, 0, 0, 0);

PRAGMA user_version = 3;
