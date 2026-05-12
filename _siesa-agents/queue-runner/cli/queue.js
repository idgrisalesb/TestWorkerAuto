'use strict';

const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');

const initCmd     = require('./commands/init');
const addCmd      = require('./commands/add');
const listCmd     = require('./commands/list');
const statusCmd   = require('./commands/status');
const migrateCmd  = require('./commands/migrate');
const healthCmd   = require('./commands/health');
const configCmd   = require('./commands/config');
const startCmd    = require('./commands/start');
const sessionsCmd = require('./commands/sessions');
const dbCmd       = require('./commands/db');
const logsCmd     = require('./commands/logs');
const retryCmd    = require('./commands/retry');
const cancelCmd   = require('./commands/cancel');
const { installServiceCmd, uninstallServiceCmd } = require('./commands/service');
const { pauseCmd, resumeCmd } = require('./commands/pause');

yargs(hideBin(process.argv))
  .scriptName('siesa-queue')
  .usage('$0 <command> [options]')
  .command(initCmd)
  .command(addCmd)
  .command(listCmd)
  .command(statusCmd)
  .command(migrateCmd)
  .command(healthCmd)
  .command(configCmd)
  .command(startCmd)
  .command(sessionsCmd)
  .command(dbCmd)
  .command(logsCmd)
  .command(retryCmd)
  .command(cancelCmd)
  .command(installServiceCmd)
  .command(uninstallServiceCmd)
  .command(pauseCmd)
  .command(resumeCmd)
  .demandCommand(1, 'Specify a command: init | add | list | status | migrate | health | config | start | sessions | db | logs | retry | cancel | install-service | uninstall-service | pause | resume')
  .strict()
  .help()
  .argv;
