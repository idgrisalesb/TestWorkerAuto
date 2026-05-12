'use strict';

/**
 * Windows installer — Task Scheduler (Option A, no admin required).
 *
 * install():
 *   1. Unregisters SiesaQueue + SiesaQueueWatchdog if they already exist (idempotence)
 *   2. Registers SiesaQueue  (AtLogOn, restart 99×, delay 1 min)
 *   3. Registers SiesaQueueWatchdog (RepetitionInterval=5min)
 *
 * uninstall():
 *   1. Unregisters both tasks (idempotent — ignores "not found")
 */

const os   = require('node:os');
const path = require('node:path');
const fs   = require('node:fs');
const { execSync } = require('node:child_process');

const TASK_DAEMON   = 'SiesaQueue';
const TASK_WATCHDOG = 'SiesaQueueWatchdog';

/**
 * Execute a PowerShell command.
 * @param {string} script
 * @param {boolean} [fatal=false]
 */
function execPS(script, fatal = false) {
  const cmd = `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "${script.replace(/"/g, '\\"')}"`;
  try {
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (out.trim()) process.stdout.write(out);
  } catch (err) {
    if (fatal) throw err;
    console.warn(`[windows-installer] Warning: ${err.message.slice(0, 200)}`);
  }
}

/**
 * Execute a multi-line PowerShell script via a temp file (avoids quoting issues).
 * @param {string} script
 * @param {boolean} [fatal=false]
 */
function execPSFile(script, fatal = false) {
  const tmpFile = path.join(os.tmpdir(), `siesa-queue-install-${Date.now()}.ps1`);
  try {
    fs.writeFileSync(tmpFile, script, 'utf8');
    const cmd = `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${tmpFile}"`;
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (out.trim()) process.stdout.write(out);
  } catch (err) {
    if (fatal) throw err;
    console.warn(`[windows-installer] Warning: ${err.message.slice(0, 200)}`);
  } finally {
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}

/**
 * Install scheduled tasks.
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

  fs.mkdirSync(path.join(queueHome, 'logs'), { recursive: true });

  const logDir      = path.join(queueHome, 'logs');
  const stdoutLog   = path.join(logDir, 'stdout.log');
  const watchdogLog = path.join(logDir, 'watchdog.log');

  // Escape paths for PowerShell strings (single-quoted)
  const nodePs       = nodePath.replace(/'/g, "''");
  const dispatcherPs = dispatcherPath.replace(/'/g, "''");
  const watchdogPs   = watchdogPath.replace(/'/g, "''");
  const stdoutPs     = stdoutLog.replace(/'/g, "''");
  const watchdogLogPs = watchdogLog.replace(/'/g, "''");

  const script = `
# Idempotence: unregister if already exists
Get-ScheduledTask -TaskName '${TASK_DAEMON}' -ErrorAction SilentlyContinue | Unregister-ScheduledTask -Confirm:$false
Get-ScheduledTask -TaskName '${TASK_WATCHDOG}' -ErrorAction SilentlyContinue | Unregister-ScheduledTask -Confirm:$false

# Main daemon task (AtLogOn, restart 99 times with 1 min delay)
$action  = New-ScheduledTaskAction -Execute '${nodePs}' -Argument '${dispatcherPs}' -WorkingDirectory '$env:USERPROFILE'
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$set     = New-ScheduledTaskSettingsSet \`
            -RestartCount 99 -RestartInterval (New-TimeSpan -Minutes 1) \`
            -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries \`
            -ExecutionTimeLimit (New-TimeSpan -Days 365)
Register-ScheduledTask -TaskName '${TASK_DAEMON}' -Action $action -Trigger $trigger -Settings $set -Force
Write-Output '${TASK_DAEMON} registered'

# Watchdog task (every 5 minutes)
$wdAction  = New-ScheduledTaskAction -Execute '${nodePs}' -Argument '${watchdogPs}'
$wdTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) \`
             -RepetitionInterval (New-TimeSpan -Minutes 5) \`
             -RepetitionDuration (New-TimeSpan -Days 365)
Register-ScheduledTask -TaskName '${TASK_WATCHDOG}' -Action $wdAction -Trigger $wdTrigger -Force
Write-Output '${TASK_WATCHDOG} registered'
`.trim();

  execPSFile(script, true);

  console.log('[windows-installer] Windows installation complete');
}

/**
 * Uninstall scheduled tasks.
 */
function uninstall() {
  const script = `
Get-ScheduledTask -TaskName '${TASK_DAEMON}'   -ErrorAction SilentlyContinue | Unregister-ScheduledTask -Confirm:$false
Get-ScheduledTask -TaskName '${TASK_WATCHDOG}' -ErrorAction SilentlyContinue | Unregister-ScheduledTask -Confirm:$false
Write-Output 'Tasks unregistered (if they existed)'
`.trim();

  execPSFile(script);

  console.log('[windows-installer] Windows uninstall complete');
}

module.exports = { install, uninstall };
