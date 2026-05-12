-- Migration 002: Add job_id to rate_limit_windows for better correlation tracking.

PRAGMA foreign_keys = ON;

ALTER TABLE rate_limit_windows ADD COLUMN job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rl_job ON rate_limit_windows(job_id);

PRAGMA user_version = 2;
