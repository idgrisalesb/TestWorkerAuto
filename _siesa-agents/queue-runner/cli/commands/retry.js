'use strict';

const os   = require('node:os');
const path = require('node:path');

const { openDb } = require('../../lib/db');

async function handler(argv) {
  const queueHome = process.env.SIESA_QUEUE_HOME || path.join(os.homedir(), '.siesa-queue');
  const db        = openDb(path.join(queueHome, 'queue.db'));

  const job = db.prepare('SELECT id, type, state, correlation_key FROM jobs WHERE id = ?').get(argv.id);

  if (!job) {
    console.error(`Job ${argv.id} not found.`);
    db.close();
    process.exit(1);
  }

  db.prepare(`
    UPDATE jobs
    SET state = 'pending', attempts = 0, not_before_ts = 0, last_error = NULL, updated_at = strftime('%s','now')
    WHERE id = ?
  `).run(argv.id);

  db.close();
  console.log(`Job ${argv.id} (${job.type} / ${job.correlation_key || '-'}) reset to pending. Previous state: ${job.state}.`);
}

module.exports = {
  command: 'retry <id>',
  describe: 'Reset a job to pending so it runs again on the next tick',
  builder: (yargs) =>
    yargs.positional('id', {
      type:        'number',
      description: 'Job ID to retry',
    }),
  handler,
};
