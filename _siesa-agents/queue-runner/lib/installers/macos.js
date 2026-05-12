'use strict';

/**
 * macOS installer — launchd LaunchAgent for daemon + watchdog.
 *
 * install():
 *   1. Writes ~/Library/LaunchAgents/com.siesa.queue.plist
 *   2. Writes ~/Library/LaunchAgents/com.siesa.queue.watchdog.plist
 *   3. Bootstraps + enables + kickstarts each plist via launchctl
 *
 * uninstall():
 *   1. Bootout both plists
 *   2. Removes plist files
 */

const os   = require('node:os');
const path = require('node:path');
const fs   = require('node:fs');
const { execSync } = require('node:child_process');

const TEMPLATE_DIR        = path.join(__dirname, 'templates');
const DAEMON_TPL          = path.join(TEMPLATE_DIR, 'com.siesa.queue.plist.tpl');
const WATCHDOG_TPL        = path.join(TEMPLATE_DIR, 'com.siesa.queue.watchdog.plist.tpl');

const LAUNCH_AGENTS_DIR   = path.join(os.homedir(), 'Library', 'LaunchAgents');
const DAEMON_PLIST_PATH   = path.join(LAUNCH_AGENTS_DIR, 'com.siesa.queue.plist');
const WATCHDOG_PLIST_PATH = path.join(LAUNCH_AGENTS_DIR, 'com.siesa.queue.watchdog.plist');
const DAEMON_LABEL        = 'com.siesa.queue';
const WATCHDOG_LABEL      = 'com.siesa.queue.watchdog';

/**
 * Render template by replacing {{KEY}} placeholders.
 */
function render(templatePath, vars) {
  let content = fs.readFileSync(templatePath, 'utf8');
  for (const [key, value] of Object.entries(vars)) {
    content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return content;
}

/**
 * Execute a shell command.  Non-fatal by default.
 */
function exec(cmd, fatal = false) {
  try {
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (out.trim()) process.stdout.write(out);
  } catch (err) {
    if (fatal) throw err;
    console.warn(`[macos-installer] Warning: ${cmd} → ${err.message.slice(0, 120)}`);
  }
}

/**
 * Get current user's UID as string (for launchctl gui/<uid>).
 */
function getUid() {
  return String(process.getuid ? process.getuid() : execSync('id -u', { encoding: 'utf8' }).trim());
}

/**
 * Install daemon + watchdog LaunchAgents.
 * @param {{ wakeLock?: boolean }} [options]
 */
function install(options = {}) {
  const home           = os.homedir();
  const queueHome      = process.env.SIESA_QUEUE_HOME || path.join(home, '.siesa-queue');
  const nodePath       = process.execPath;
  const dispatcherPath = path.resolve(__dirname, '../../runtime/dispatcher.js');
  const watchdogPath   = path.resolve(__dirname, '../../runtime/watchdog.js');

  if (!fs.existsSync(dispatcherPath)) {
    throw new Error(`dispatcher.js not found at: ${dispatcherPath}`);
  }

  const vars = {
    NODE_PATH:        nodePath,
    DISPATCHER_PATH:  dispatcherPath,
    WATCHDOG_PATH:    watchdogPath,
    SIESA_QUEUE_HOME: queueHome,
    USER:             process.env.USER || os.userInfo().username,
  };

  fs.mkdirSync(LAUNCH_AGENTS_DIR, { recursive: true });
  fs.mkdirSync(path.join(queueHome, 'logs'), { recursive: true });

  // Write plists
  fs.writeFileSync(DAEMON_PLIST_PATH,   render(DAEMON_TPL,   vars), 'utf8');
  fs.writeFileSync(WATCHDOG_PLIST_PATH, render(WATCHDOG_TPL, vars), 'utf8');

  console.log(`[macos-installer] Wrote ${DAEMON_PLIST_PATH}`);
  console.log(`[macos-installer] Wrote ${WATCHDOG_PLIST_PATH}`);

  const uid = getUid();

  _loadPlist(uid, DAEMON_PLIST_PATH, DAEMON_LABEL);
  _loadPlist(uid, WATCHDOG_PLIST_PATH, WATCHDOG_LABEL);

  console.log('[macos-installer] macOS installation complete');
}

/**
 * Uninstall daemon + watchdog.
 */
function uninstall() {
  const uid = getUid();

  _unloadPlist(uid, DAEMON_PLIST_PATH, DAEMON_LABEL);
  _unloadPlist(uid, WATCHDOG_PLIST_PATH, WATCHDOG_LABEL);

  // Remove plist files
  for (const plistPath of [DAEMON_PLIST_PATH, WATCHDOG_PLIST_PATH]) {
    if (fs.existsSync(plistPath)) {
      fs.unlinkSync(plistPath);
      console.log(`[macos-installer] Removed ${plistPath}`);
    }
  }

  console.log('[macos-installer] macOS uninstall complete');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _loadPlist(uid, plistPath, label) {
  // Idempotence: bootout first if already loaded (ignore errors)
  exec(`launchctl bootout gui/${uid}/${label}`);

  exec(`launchctl bootstrap gui/${uid} ${plistPath}`);
  exec(`launchctl enable gui/${uid}/${label}`);
  exec(`launchctl kickstart -k gui/${uid}/${label}`);

  console.log(`[macos-installer] Loaded ${label}`);
}

function _unloadPlist(uid, _plistPath, label) {
  exec(`launchctl bootout gui/${uid}/${label}`);
  console.log(`[macos-installer] Booted out ${label}`);
}

module.exports = { install, uninstall };
