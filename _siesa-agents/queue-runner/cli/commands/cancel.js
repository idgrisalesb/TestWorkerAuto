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

  if (job.state === 'cancelled') {
    console.log(`Job ${argv.id} is already cancelled.`);
    db.close();
    return;
  }

  if (job.state === 'succeeded') {
    console.error(`Job ${argv.id} already succeeded — cannot cancel.`);
    db.close();
    process.exit(1);
  }

  db.prepare(`
    UPDATE jobs
    SET state = 'cancelled', updated_at = strftime('%s','now')
    WHERE id = ?
  `).run(argv.id);

  db.close();
  console.log(`Job ${argv.id} (${job.type} / ${job.correlation_key || '-'}) cancelled. Previous state: ${job.state}.`);

  if (job.state === 'running' || job.state === 'claimed') {
    console.log('Note: if the daemon has a Worker active for this job, it will finish its current claude invocation but the job will be marked cancelled on completion.');
  }
}

module.exports = {
  command: 'cancel <id>',
  describe: 'Cancel a pending, claimed, running or waiting_rate_limit job',
  builder: (yargs) =>
    yargs.positional('id', {
      type:        'number',
      description: 'Job ID to cancel',
    }),
  handler,
};
