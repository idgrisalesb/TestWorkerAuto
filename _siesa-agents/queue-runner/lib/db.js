'use strict';

const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');

const SCHEMA_PATH      = path.join(__dirname, 'schema.sql');
const MIGRATIONS_DIR   = path.join(__dirname, 'migrations');
const CURRENT_VERSION  = 4;

/**
 * Apply schema.sql to a fresh database (user_version=0).
 * @param {import('better-sqlite3').Database} db
 */
function applySchema(db) {
  const version = db.pragma('user_version', { simple: true });
  if (version === 0) {
    const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
    db.exec(sql);
  }
}

/**
 * Run pending migrations for databases that were created at an earlier version.
 * Migration files are named NNN_description.sql and applied in order.
 * @param {import('better-sqlite3').Database} db
 */
function applyMigrations(db) {
  const version = db.pragma('user_version', { simple: true });
  if (version >= CURRENT_VERSION) return;

  // Collect migration files with numeric prefix > current version
  let files;
  try {
    files = fs.readdirSync(MIGRATIONS_DIR)
      .filter((f) => /^\d+_.*\.sql$/.test(f))
      .sort();
  } catch {
    return; // migrations dir may not exist
  }

  for (const file of files) {
    const migNum = parseInt(file.split('_')[0], 10);
    if (migNum > version) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      try {
        db.exec(sql);
      } catch (err) {
        // Column may already exist (e.g. re-applied migration) — tolerate
        if (!err.message.includes('duplicate column')) throw err;
      }
    }
  }
}

/**
 * Open (or create) the SQLite database at the given path.
 * Applies schema if fresh (user_version=0), then runs pending migrations.
 * @param {string} dbPath - Full path to the .db file
 * @returns {import('better-sqlite3').Database}
 */
function openDb(dbPath) {
  const db = new Database(dbPath);
  // Set pragmas before checking user_version
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  applySchema(db);
  applyMigrations(db);
  return db;
}

module.exports = { openDb, applySchema, applyMigrations };
