'use strict';

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const os = require('node:os');

const { openDb } = require('../../lib/db');

const CONFIG_FILES = ['model-policy.json', 'rate-limit-patterns.json'];
const CONFIG_SRC_DIR = path.join(__dirname, '../../config');

/**
 * Prompt user for ANTHROPIC_API_KEY interactively.
 * @returns {Promise<string>}
 */
function promptApiKey() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Enter ANTHROPIC_API_KEY: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Handler for `queue init`.
 * @param {object} argv - yargs argv
 */
async function handler(argv) {
  const queueHome = argv.home
    || process.env.SIESA_QUEUE_HOME
    || path.join(os.homedir(), '.siesa-queue');

  // Create directories
  const logsDir = path.join(queueHome, 'logs');
  fs.mkdirSync(logsDir, { recursive: true });
  console.log(`Queue home: ${queueHome}`);

  // Open / create database — applySchema runs if user_version=0
  const dbPath = path.join(queueHome, 'queue.db');

  // Remove orphaned WAL files if the main DB was manually deleted
  if (!fs.existsSync(dbPath)) {
    for (const ext of ['-shm', '-wal']) {
      const walFile = dbPath + ext;
      if (fs.existsSync(walFile)) fs.rmSync(walFile);
    }
  }

  const db = openDb(dbPath);
  const version = db.pragma('user_version', { simple: true });
  console.log(`Database initialized (user_version=${version}): ${dbPath}`);

  // Copy default config files if absent
  for (const file of CONFIG_FILES) {
    const dest = path.join(queueHome, file);
    if (!fs.existsSync(dest)) {
      const src = path.join(CONFIG_SRC_DIR, file);
      fs.copyFileSync(src, dest);
      console.log(`Config created: ${dest}`);
    } else {
      console.log(`Config already exists (skipped): ${dest}`);
    }
  }

  // Ensure auth: prefer Claude Code OAuth session, else env var, else prompt.
  const claudeCredsPath = path.join(os.homedir(), '.claude', '.credentials.json');
  const hasClaudeOauth = fs.existsSync(claudeCredsPath);

  if (process.env.ANTHROPIC_API_KEY) {
    console.log('ANTHROPIC_API_KEY already set in environment.');
  } else if (hasClaudeOauth) {
    console.log('Detected Claude Code OAuth session at ~/.claude/.credentials.json — using existing login.');
  } else {
    console.warn('No Claude Code OAuth session detected and ANTHROPIC_API_KEY is not set.');
    const key = await promptApiKey();
    if (key) {
      process.env.ANTHROPIC_API_KEY = key;
      console.log('ANTHROPIC_API_KEY set for this session. Add it to your shell profile to persist.');
    } else {
      console.warn('Warning: no credentials configured. Run `claude` to log in before `siesa-queue start`.');
    }
  }

  db.close();
  console.log('queue init complete.');
}

module.exports = {
  command: 'init',
  describe: 'Initialize $SIESA_QUEUE_HOME: create DB, apply schema, copy default configs',
  builder: (yargs) =>
    yargs.option('home', {
      type: 'string',
      description: 'Override $SIESA_QUEUE_HOME path',
    }),
  handler,
};
