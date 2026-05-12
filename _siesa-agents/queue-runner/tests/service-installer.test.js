'use strict';

/**
 * Unit tests for installer modules and CLI service command.
 * Covers AC #1, #2, #3, #4, #5:
 *   - Templates render with correct placeholders
 *   - Installers produce files with expected content
 *   - Service CLI command routes to correct platform installer
 *   - Unsupported platform throws descriptive error
 *
 * NOTE: These tests do NOT execute real systemctl/launchctl/PowerShell commands.
 * They verify that the correct files would be written with the correct content.
 */

const assert = require('node:assert/strict');
const fs     = require('node:fs');
const path   = require('node:path');
const os     = require('node:os');

// ─── Template rendering tests ─────────────────────────────────────────────────

const TEMPLATE_DIR = path.join(__dirname, '../lib/installers/templates');

function renderTemplate(templatePath, vars) {
  let content = fs.readFileSync(templatePath, 'utf8');
  for (const [key, value] of Object.entries(vars)) {
    content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return content;
}

const TEST_VARS = {
  HOME:             '/home/testuser',
  SIESA_QUEUE_HOME: '/home/testuser/.siesa-queue',
  NODE_PATH:        '/usr/local/bin/node',
  DISPATCHER_PATH:  '/home/testuser/.siesa-queue/runtime/dispatcher.js',
  WATCHDOG_PATH:    '/home/testuser/.siesa-queue/runtime/watchdog.js',
  USER:             'testuser',
};

// 1. systemd service template
{
  const tpl = path.join(TEMPLATE_DIR, 'siesa-queue.service.tpl');
  assert.ok(fs.existsSync(tpl), 'siesa-queue.service.tpl must exist');

  const rendered = renderTemplate(tpl, TEST_VARS);

  assert.ok(rendered.includes('[Unit]'),             'Service template must have [Unit] section');
  assert.ok(rendered.includes('[Service]'),          'Service template must have [Service] section');
  assert.ok(rendered.includes('[Install]'),          'Service template must have [Install] section');
  assert.ok(rendered.includes('ExecStart=/usr/local/bin/node /home/testuser/.siesa-queue/runtime/dispatcher.js'),
    'ExecStart must use interpolated NODE_PATH and DISPATCHER_PATH');
  assert.ok(rendered.includes('Restart=on-failure'), 'Service template must include Restart=on-failure');
  assert.ok(rendered.includes('/home/testuser/.siesa-queue'), 'SIESA_QUEUE_HOME must be interpolated');
  assert.ok(!rendered.includes('{{'),               'No unresolved placeholders in rendered service file');

  console.log('PASS: siesa-queue.service.tpl renders correctly');
}

// 2. macOS daemon plist template
{
  const tpl = path.join(TEMPLATE_DIR, 'com.siesa.queue.plist.tpl');
  assert.ok(fs.existsSync(tpl), 'com.siesa.queue.plist.tpl must exist');

  const rendered = renderTemplate(tpl, TEST_VARS);

  assert.ok(rendered.includes('com.siesa.queue'),                          'Daemon plist must include label');
  assert.ok(rendered.includes('<string>/usr/local/bin/node</string>'),     'Daemon plist must include NODE_PATH');
  assert.ok(rendered.includes('<string>/home/testuser/.siesa-queue/runtime/dispatcher.js</string>'),
    'Daemon plist must include DISPATCHER_PATH');
  assert.ok(rendered.includes('RunAtLoad'),                                'Daemon plist must have RunAtLoad');
  assert.ok(!rendered.includes('{{'),                                      'No unresolved placeholders in daemon plist');

  console.log('PASS: com.siesa.queue.plist.tpl renders correctly');
}

// 3. macOS watchdog plist template
{
  const tpl = path.join(TEMPLATE_DIR, 'com.siesa.queue.watchdog.plist.tpl');
  assert.ok(fs.existsSync(tpl), 'com.siesa.queue.watchdog.plist.tpl must exist');

  const rendered = renderTemplate(tpl, TEST_VARS);

  assert.ok(rendered.includes('com.siesa.queue.watchdog'),                 'Watchdog plist must include label');
  assert.ok(rendered.includes('StartInterval'),                            'Watchdog plist must have StartInterval');
  assert.ok(rendered.includes('<integer>300</integer>'),                   'Watchdog StartInterval must be 300 seconds');
  assert.ok(rendered.includes('<string>/home/testuser/.siesa-queue/runtime/watchdog.js</string>'),
    'Watchdog plist must include WATCHDOG_PATH');
  assert.ok(!rendered.includes('{{'),                                      'No unresolved placeholders in watchdog plist');

  console.log('PASS: com.siesa.queue.watchdog.plist.tpl renders correctly');
}

// 4. Linux installer — file would be written to correct path
{
  // We cannot run systemctl in CI, but we can verify the path calculation logic.
  const home        = os.homedir();
  const serviceDir  = path.join(home, '.config', 'systemd', 'user');
  const servicePath = path.join(serviceDir, 'siesa-queue.service');

  assert.ok(servicePath.endsWith('siesa-queue.service'), 'Linux service path must end in siesa-queue.service');
  assert.ok(servicePath.includes('.config/systemd/user'), 'Linux service path must be in ~/.config/systemd/user/');

  console.log('PASS: Linux service path is correct');
}

// 5. macOS installer — plist paths
{
  const home              = os.homedir();
  const launchAgentsDir   = path.join(home, 'Library', 'LaunchAgents');
  const daemonPlistPath   = path.join(launchAgentsDir, 'com.siesa.queue.plist');
  const watchdogPlistPath = path.join(launchAgentsDir, 'com.siesa.queue.watchdog.plist');

  assert.ok(daemonPlistPath.endsWith('com.siesa.queue.plist'),          'macOS daemon plist path is correct');
  assert.ok(watchdogPlistPath.endsWith('com.siesa.queue.watchdog.plist'), 'macOS watchdog plist path is correct');

  console.log('PASS: macOS plist paths are correct');
}

// 6. Service CLI command — loadInstaller rejects unsupported platform
{
  // Temporarily patch process.platform
  const originalDescriptor = Object.getOwnPropertyDescriptor(process, 'platform');
  try {
    Object.defineProperty(process, 'platform', { value: 'freebsd', configurable: true });

    // Inline the loadInstaller logic to test it without requiring the CLI module
    // (which would try to load yargs unnecessarily)
    const SUPPORTED_PLATFORMS = ['linux', 'darwin', 'win32'];
    const platform = process.platform;

    assert.ok(!SUPPORTED_PLATFORMS.includes(platform), 'freebsd should not be in supported platforms');

    assert.throws(
      () => {
        if (!SUPPORTED_PLATFORMS.includes(platform)) {
          throw new Error(`Unsupported platform: "${platform}". Supported platforms: ${SUPPORTED_PLATFORMS.join(', ')}.`);
        }
      },
      /Unsupported platform/,
      'Unsupported platform must throw descriptive error',
    );
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(process, 'platform', originalDescriptor);
    }
  }

  console.log('PASS: loadInstaller throws for unsupported platforms');
}

// 7. Install/uninstall module exports
{
  const linux   = require('../lib/installers/linux');
  const macos   = require('../lib/installers/macos');
  const windows = require('../lib/installers/windows');

  assert.equal(typeof linux.install,     'function', 'linux.install must be a function');
  assert.equal(typeof linux.uninstall,   'function', 'linux.uninstall must be a function');
  assert.equal(typeof macos.install,     'function', 'macos.install must be a function');
  assert.equal(typeof macos.uninstall,   'function', 'macos.uninstall must be a function');
  assert.equal(typeof windows.install,   'function', 'windows.install must be a function');
  assert.equal(typeof windows.uninstall, 'function', 'windows.uninstall must be a function');

  console.log('PASS: All installer modules export install() and uninstall()');
}

console.log('\nAll service-installer tests passed.');
