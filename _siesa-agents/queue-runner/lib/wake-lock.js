'use strict';

/**
 * WakeLock — prevents system sleep while jobs are in-flight.
 *
 * Behaviour is controlled by env SIESA_QUEUE_WAKE_LOCK:
 *   auto   (default) — launch only if the required binary is available
 *   always            — always launch (fail if binary missing)
 *   never             — no-op
 *
 * Platform implementations:
 *   linux  — systemd-inhibit --what=sleep:idle --who=siesa-queue --why="processing queue" sleep infinity
 *   darwin — caffeinate -dimsu -w <dispatcherPid>
 *   win32  — PowerShell loop calling SetThreadExecutionState(0x80000003)
 */

const { spawn, spawnSync } = require('node:child_process');

// PowerShell script that calls SetThreadExecutionState(ES_SYSTEM_REQUIRED | ES_CONTINUOUS)
// 0x80000003 = ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_AWAYMODE_REQUIRED is not needed;
// 0x80000001 = ES_CONTINUOUS | ES_SYSTEM_REQUIRED
const WAKE_LOCK_PS_SCRIPT = `
$signature = @'
[DllImport("kernel32.dll", SetLastError=true)]
public static extern uint SetThreadExecutionState(uint esFlags);
'@
Add-Type -MemberDefinition $signature -Name "WinAPI" -Namespace "WakeLock"
while ($true) {
  [WakeLock.WinAPI]::SetThreadExecutionState(0x80000003) | Out-Null
  Start-Sleep -Seconds 30
}
`.trim();

/**
 * Check whether a binary is available on PATH (or as an absolute path).
 * @param {string} bin
 * @returns {boolean}
 */
function isBinaryAvailable(bin) {
  try {
    // Use 'which' on Unix, 'where' on Windows
    const cmd   = process.platform === 'win32' ? 'where' : 'which';
    const result = spawnSync(cmd, [bin], { stdio: 'ignore', shell: false });
    return result.status === 0;
  } catch {
    return false;
  }
}

class WakeLock {
  constructor() {
    this._child = null;
    this._mode  = (process.env.SIESA_QUEUE_WAKE_LOCK || 'auto').toLowerCase();
  }

  /**
   * Acquire wake-lock.  Safe to call multiple times — subsequent calls are no-ops
   * if a child process is already running.
   * @param {number} dispatcherPid — PID of the dispatcher (used by caffeinate on macOS)
   */
  acquire(dispatcherPid) {
    if (this._mode === 'never') return;
    if (this._child) return; // already acquired

    const platform = process.platform;

    try {
      if (platform === 'linux') {
        this._acquireLinux();
      } else if (platform === 'darwin') {
        this._acquireMacOS(dispatcherPid);
      } else if (platform === 'win32') {
        this._acquireWindows();
      } else {
        // Unsupported platform — silently skip
      }
    } catch (err) {
      // Wake-lock is best-effort — never crash the dispatcher
      console.error(JSON.stringify({ ts: Math.floor(Date.now() / 1000), level: 'warn', event: 'wake_lock.acquire_error', message: err.message }));
    }
  }

  /**
   * Release the wake-lock by terminating the child process.
   * Safe to call when not acquired.
   */
  release() {
    if (!this._child) return;

    try {
      // SIGTERM is the graceful signal; on Windows child_process translates to TerminateProcess
      this._child.kill('SIGTERM');
    } catch {
      // Ignore errors — process may have already exited
    } finally {
      this._child = null;
    }
  }

  // ─── Platform implementations ─────────────────────────────────────────────

  _acquireLinux() {
    const bin = 'systemd-inhibit';

    if (this._mode === 'auto' && !isBinaryAvailable(bin)) {
      console.error(JSON.stringify({
        ts:      Math.floor(Date.now() / 1000),
        level:   'warn',
        event:   'wake_lock.unavailable',
        message: `${bin} not found — wake-lock disabled (set SIESA_QUEUE_WAKE_LOCK=never to silence)`,
      }));
      return;
    }

    this._child = spawn(
      bin,
      ['--what=sleep:idle', '--who=siesa-queue', '--why=processing queue', 'sleep', 'infinity'],
      { detached: false, stdio: 'ignore' },
    );

    this._attachErrorHandlers('linux');
  }

  _acquireMacOS(dispatcherPid) {
    const bin = 'caffeinate';

    if (this._mode === 'auto' && !isBinaryAvailable(bin)) {
      console.error(JSON.stringify({
        ts:      Math.floor(Date.now() / 1000),
        level:   'warn',
        event:   'wake_lock.unavailable',
        message: `${bin} not found — wake-lock disabled`,
      }));
      return;
    }

    // -dimsu: display, idle, system, user activity
    // -w <pid>: auto-release when pid exits
    this._child = spawn(
      bin,
      ['-dimsu', '-w', String(dispatcherPid)],
      { detached: false, stdio: 'ignore' },
    );

    this._attachErrorHandlers('darwin');
  }

  _acquireWindows() {
    const bin = 'powershell';

    if (this._mode === 'auto' && !isBinaryAvailable(bin)) {
      console.error(JSON.stringify({
        ts:      Math.floor(Date.now() / 1000),
        level:   'warn',
        event:   'wake_lock.unavailable',
        message: `${bin} not found — wake-lock disabled`,
      }));
      return;
    }

    this._child = spawn(
      bin,
      ['-NoProfile', '-NonInteractive', '-Command', WAKE_LOCK_PS_SCRIPT],
      { detached: false, stdio: 'ignore' },
    );

    this._attachErrorHandlers('win32');
  }

  _attachErrorHandlers(platform) {
    if (!this._child) return;

    this._child.on('error', (err) => {
      console.error(JSON.stringify({
        ts:       Math.floor(Date.now() / 1000),
        level:    'warn',
        event:    'wake_lock.child_error',
        platform,
        message:  err.message,
      }));
      this._child = null;
    });

    this._child.on('exit', (code, signal) => {
      // Only log unexpected exits (not from our own release() call)
      if (this._child) {
        console.error(JSON.stringify({
          ts:       Math.floor(Date.now() / 1000),
          level:    'info',
          event:    'wake_lock.child_exited',
          platform,
          code,
          signal,
        }));
        this._child = null;
      }
    });
  }
}

module.exports = { WakeLock };
