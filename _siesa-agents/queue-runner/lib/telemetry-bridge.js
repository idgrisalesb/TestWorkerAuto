'use strict';

const { spawn } = require('node:child_process');
const path  = require('node:path');
const fs    = require('node:fs');

const BMAD_TYPES = ['create-story', 'dev-story', 'code-review'];

// Maps internal dispatcher events → sa-emit.js argv fragments
const EVENT_MAP = {
  'job.start':           { event: 'workflow.started' },
  'job.finish':          { event: 'workflow.finished' },
  'rate_limit.detected': { event: 'status.changed', from: 'running', to: 'waiting_rate_limit' },
  'job.cancel':          { event: 'status.changed', from: 'running', to: 'abandoned' },
  'budget.exceeded':     { event: 'status.changed', from: 'running', to: 'paused' },
};

class TelemetryBridge {
  constructor({ logger } = {}) {
    this.logger   = logger || console;
    this.disabled = false;
    // Resolved relative to cwd of the client project where _siesa-agents/ is installed
    this.saEmitPath = path.join(process.cwd(), '_siesa-agents/observability/scripts/sa-emit.js');
    if (!fs.existsSync(this.saEmitPath)) {
      this._warn('telemetry_bridge.disabled', { reason: 'sa-emit.js not found', path: this.saEmitPath });
      this.disabled = true;
    }
  }

  /**
   * Emit an internal dispatcher event, mapping it to a sa-emit.js invocation.
   * @param {string} internalEvent - one of the EVENT_MAP keys
   * @param {object} job           - jobs table row (type, payload_json)
   * @param {string|null} sessionId
   */
  emit(internalEvent, job, sessionId) {
    const mapping = EVENT_MAP[internalEvent];
    if (!mapping) return;

    let payload;
    try {
      payload = typeof job.payload_json === 'string'
        ? JSON.parse(job.payload_json)
        : (job.payload_json || {});
    } catch {
      payload = {};
    }

    const storyId = payload.story_id || 'unknown';
    const phase   = job.type || 'unknown';

    // Always produce a local log entry
    this._info(`telemetry_bridge.${internalEvent}`, {
      story_id:   storyId,
      phase,
      session_id: sessionId || null,
      sa_event:   mapping.event,
    });

    // Only forward to sa-emit for BMAD job types with valid phase values
    if (!BMAD_TYPES.includes(job.type)) return;
    if (this.disabled) return;

    const args = [
      this.saEmitPath,
      '--event', mapping.event,
      '--phase', phase,
      '--story', storyId,
    ];
    if (sessionId)    args.push('--session-id', sessionId);
    if (mapping.from) args.push('--from', mapping.from);
    if (mapping.to)   args.push('--to',   mapping.to);

    const child = spawn('node', args, { stdio: 'ignore' });
    child.on('error', (err) => {
      this._warn('telemetry_bridge.spawn_error', { message: err.message });
    });
    child.on('exit', (code) => {
      if (code !== 0) {
        this._warn('telemetry_bridge.sa_emit_failed', { code, internalEvent });
      }
    });
  }

  /**
   * Emit a daemon-level status.changed event (not tied to a specific job).
   * Used for budget.exceeded (AC #6) and budget auto-resume (AC #7).
   *
   * @param {string} from      - previous state (e.g. 'running', 'paused')
   * @param {string} to        - new state (e.g. 'paused', 'running')
   * @param {object} [meta]    - additional context merged into log entry
   */
  emitStatusChanged(from, to, meta = {}) {
    const internalEvent = `status.${from}_to_${to}`;

    // Always produce a local log entry
    this._info(`telemetry_bridge.${internalEvent}`, {
      from,
      to,
      sa_event: 'status.changed',
      ...meta,
    });

    if (this.disabled) return;

    const args = [
      this.saEmitPath,
      '--event',  'status.changed',
      '--phase',  'daemon',
      '--story',  'daemon',
      '--from',   from,
      '--to',     to,
    ];

    const child = spawn('node', args, { stdio: 'ignore' });
    child.on('error', (err) => {
      this._warn('telemetry_bridge.spawn_error', { message: err.message, internalEvent });
    });
    child.on('exit', (code) => {
      if (code !== 0) {
        this._warn('telemetry_bridge.sa_emit_failed', { code, internalEvent });
      }
    });
  }

  _info(msg, meta) {
    if (typeof this.logger.info === 'function') this.logger.info(msg, meta);
  }

  _warn(msg, meta) {
    if (typeof this.logger.warn === 'function') this.logger.warn(msg, meta);
  }
}

module.exports = { TelemetryBridge };
