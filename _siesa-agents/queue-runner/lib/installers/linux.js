'use strict';

/**
 * Linux installer — systemd-user + crontab watchdog.
 *
 * install():
 *   1. Writes ~/.config/systemd/user/siesa-queue.service
 *   2. Runs loginctl enable-linger $USER
 *   3. Runs systemctl --user daemon-reload
 *   4. Runs systemctl --user enable --now siesa-queue.service
 *   5. Adds watchdog entry to user crontab (idempotent)
 *
 * uninstall():
 *   1. Stops/disables systemd service
 *   2. Removes service file
 *   3. Removes watchdog crontab entry
 */

const os   = require('node:os');
const path = require('node:path');
const fs   = require('node:fs');
const { execSync } = require('node:child_process');

const TEMPLATE_DIR     = path.join(__dirname, 'templates');
const SERVICE_TEMPLATE = path.join(TEMPLATE_DIR, 'siesa-queue.service.tpl');
const CRON_MARKER      = '# siesa-queue-watchdog';

/**
 * Render a template by replacing {{KEY}} placeholders.
 * @param {string} templatePath
 * @param {Record<string,string>} vars
 * @returns {string}
 */
function render(templatePath, vars) {
  let content = fs.readFileSync(templatePath, 'utf8');
  for (const [key, value] of Object.entries(vars)) {
    content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return content;
}

/**
 * Execute a shell command, logging the output; swallow non-fatal errors.
 * @param {string} cmd
 * @param {boolean} [fatal=false]
 */
function exec(cmd, fatal = false) {
  try {
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (out.trim()) process.stdout.write(out);
  } catch (err) {
    if (fatal) throw err;
    console.warn(`[linux-installer] Warning: ${cmd} exited with error: ${err.message}`);
  }
}

/**
 * Install the service and watchdog.
 * @param {{ wakeLock?: boolean }} [options]
 */
function install(options = {}) {
  const home         = os.homedir();
  const queueHome    = process.env.SIESA_QUEUE_HOME || path.join(home, '.siesa-queue');
  const nodePath     = process.execPath;
  const dispatcherPath = path.resolve(__dirname, '../../runtime/dispatcher.js');
  const watchdogPath   = path.resolve(__dirname, '../../runtime/watchdog.js');

  if (!fs.existsSync(dispatcherPath)) {
    throw new Error(`dispatcher.js not found at: ${dispatcherPath}`);
  }

  // 1. Generate service file
  const serviceContent = render(SERVICE_TEMPLATE, {
    HOME:             home,
    SIESA_QUEUE_HOME: queueHome,
    NODE_PATH:        nodePath,
    DISPATCHER_PATH:  dispatcherPath,
    USER:             process.env.USER || os.userInfo().username,
  });

  const serviceDir  = path.join(home, '.config', 'systemd', 'user');
  const servicePath = path.join(serviceDir, 'siesa-queue.service');

  fs.mkdirSync(serviceDir, { recursive: true });
  fs.mkdirSync(path.join(queueHome, 'logs'), { recursive: true });

  // Idempotence: skip write if content unchanged
  let existing = '';
  try { existing = fs.readFileSync(servicePath, 'utf8'); } catch { /* file does not exist yet */ }

  if (existing !== serviceContent) {
    fs.writeFileSync(servicePath, serviceContent, 'utf8');
    console.log(`[linux-installer] Wrote ${servicePath}`);
  } else {
    console.log(`[linux-installer] Service file unchanged — skipping write`);
  }

  // 2. Enable linger (daemon survives without graphical session)
  const user = process.env.USER || os.userInfo().username;
  exec(`loginctl enable-linger ${user}`);

  // 3. Reload and enable service
  exec('systemctl --user daemon-reload');
  exec('systemctl --user enable --now siesa-queue.service');

  console.log('[linux-installer] systemd service installed and started');

  // 4. Crontab watchdog
  _installCrontab(nodePath, watchdogPath, queueHome);

  console.log('[linux-installer] Linux installation complete');
}

/**
 * Uninstall the service and watchdog.
 */
function uninstall() {
  const home        = os.homedir();
  const servicePath = path.join(home, '.config', 'systemd', 'user', 'siesa-queue.service');

  // Stop and disable (errors are non-fatal — may not be running)
  exec('systemctl --user stop siesa-queue.service');
  exec('systemctl --user disable siesa-queue.service');

  // Remove service file
  if (fs.existsSync(servicePath)) {
    fs.unlinkSync(servicePath);
    console.log(`[linux-installer] Removed ${servicePath}`);
  }

  exec('systemctl --user daemon-reload');

  // Remove watchdog from crontab
  _removeCrontab();

  console.log('[linux-installer] Linux uninstall complete');
}

// ─── Crontab helpers ──────────────────────────────────────────────────────────

function _installCrontab(nodePath, watchdogPath, queueHome) {
  const current = _readCrontab();
  const line    = `*/5 * * * * ${nodePath} ${watchdogPath} >> ${queueHome}/logs/watchdog.log 2>&1 ${CRON_MARKER}`;

  if (current.includes(CRON_MARKER)) {
    // Replace existing watchdog line (idempotent update)
    const updated = current
      .split('\n')
      .map(l => l.includes(CRON_MARKER) ? line : l)
      .join('\n');
    _writeCrontab(updated);
    console.log('[linux-installer] Updated watchdog crontab entry');
  } else {
    const newContent = current.trimEnd() + (current.trim() ? '\n' : '') + line + '\n';
    _writeCrontab(newContent);
    console.log('[linux-installer] Added watchdog crontab entry');
  }
}

function _removeCrontab() {
  const current = _readCrontab();
  if (!current.includes(CRON_MARKER)) {
    console.log('[linux-installer] No watchdog crontab entry found — nothing to remove');
    return;
  }

  const updated = current
    .split('\n')
    .filter(l => !l.includes(CRON_MARKER))
    .join('\n');
  _writeCrontab(updated);
  console.log('[linux-installer] Removed watchdog crontab entry');
}

function _readCrontab() {
  try {
    return execSync('crontab -l 2>/dev/null || true', { encoding: 'utf8', shell: '/bin/sh' });
  } catch {
    return '';
  }
}

function _writeCrontab(content) {
  const { execSync: ex } = require('node:child_process');
  // pipe content to crontab via echo | crontab -
  ex(`echo ${JSON.stringify(content)} | crontab -`, { shell: '/bin/sh' });
}

module.exports = { install, uninstall };
