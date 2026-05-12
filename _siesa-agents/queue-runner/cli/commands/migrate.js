'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { openDb } = require('../../lib/db');

const MIGRATIONS_DIR = path.join(__dirname, '../../lib/migrations');

async function handler(argv) {
  const queueHome = process.env.SIESA_QUEUE_HOME || path.join(os.homedir(), '.siesa-queue');
  const dbPath = path.join(queueHome, 'queue.db');
  const db = openDb(dbPath);

  const currentVersion = /** @type {number} */ (db.pragma('user_version', { simple: true }));
  console.log(`Current user_version: ${currentVersion}`);

  // Collect migration files ordered numerically
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{3}_.*\.sql$/.test(f))
    .sort();

  let applied = 0;

  for (const file of files) {
    // Extract version number from filename prefix (e.g. 001 → 1)
    const fileVersion = parseInt(file.slice(0, 3), 10);

    if (fileVersion <= currentVersion) {
      console.log(`  skip ${file} (already at version ${currentVersion})`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`  applying ${file} ...`);

    const applyMigration = db.transaction(() => {
      db.exec(sql);
    });

    try {
      applyMigration();
      applied++;
      const newVersion = db.pragma('user_version', { simple: true });
      console.log(`  applied ${file} -> user_version=${newVersion}`);
    } catch (err) {
      console.error(`  ERROR applying ${file}: ${err.message}`);
      db.close();
      process.exit(1);
    }
  }

  db.close();

  if (applied === 0) {
    console.log('No migrations to apply. Database is up to date.');
  } else {
    console.log(`${applied} migration(s) applied successfully.`);
  }
}

module.exports = {
  command: 'migrate',
  describe: 'Apply pending migrations from lib/migrations/ based on PRAGMA user_version',
  builder: (yargs) => yargs,
  handler,
};
