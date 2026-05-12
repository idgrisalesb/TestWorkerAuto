-- Migration 004: Add concurrency column to daemon_config for N>1 Workers support.

PRAGMA foreign_keys = ON;

ALTER TABLE daemon_config ADD COLUMN concurrency INTEGER NOT NULL DEFAULT 1;

PRAGMA user_version = 4;
