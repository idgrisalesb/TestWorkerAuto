'use strict';

/**
 * `queue install-service [--wake-lock]`  — install OS daemon + watchdog
 * `queue uninstall-service`              — uninstall OS daemon + watchdog
 *
 * Detects process.platform and delegates to the appropriate platform installer.
 */

const SUPPORTED_PLATFORMS = ['linux', 'darwin', 'win32'];

/**
 * Load the platform-specific installer module.
 * @returns {{ install: Function, uninstall: Function }}
 */
function loadInstaller() {
  const platform = process.platform;

  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    throw new Error(
      `Unsupported platform: "${platform}". Supported platforms: ${SUPPORTED_PLATFORMS.join(', ')}.`,
    );
  }

  const platformMap = {
    linux:  '../../../lib/installers/linux',
    darwin: '../../../lib/installers/macos',
    win32:  '../../../lib/installers/windows',
  };

  return require(platformMap[platform]);
}

// ─── install-service ──────────────────────────────────────────────────────────

const installServiceCmd = {
  command:  'install-service',
  describe: 'Detect OS and install queue daemon + watchdog as system service (idempotent)',

  builder: (yargs) =>
    yargs.option('wake-lock', {
      type:        'boolean',
      description: 'Enable wake-lock to prevent system sleep while jobs are in-flight',
      default:     false,
    }),

  async handler(argv) {
    console.log(`[service] Detected platform: ${process.platform}`);
    const installer = loadInstaller();
    await installer.install({ wakeLock: argv['wake-lock'] });
    console.log('[service] install-service completed successfully');
  },
};

// ─── uninstall-service ────────────────────────────────────────────────────────

const uninstallServiceCmd = {
  command:  'uninstall-service',
  describe: 'Uninstall the queue daemon and watchdog service (idempotent)',

  builder: (yargs) => yargs,

  async handler() {
    console.log(`[service] Detected platform: ${process.platform}`);
    const installer = loadInstaller();
    await installer.uninstall();
    console.log('[service] uninstall-service completed successfully');
  },
};

module.exports = { installServiceCmd, uninstallServiceCmd };
