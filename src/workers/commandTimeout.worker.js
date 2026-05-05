import { getPool } from '../config/db.js';
import { env } from '../config/env.js';
import { ERROR_CODES } from '../utils/errorCodes.js';

const ACK_TIMEOUT_MESSAGE = 'Command was not acknowledged before timeout.';
const COMPLETE_TIMEOUT_MESSAGE = 'Command was accepted but did not complete before timeout.';

function secondsAgo(seconds, now = new Date()) {
  return new Date(now.getTime() - seconds * 1000);
}

function rowCount(result) {
  return Number(result?.affectedRows || 0);
}

export function getCommandTimeoutThresholds(now = new Date()) {
  return {
    ackThreshold: secondsAgo(env.workers.commandAckTimeoutSec, now),
    completeThreshold: secondsAgo(env.workers.commandCompleteTimeoutSec, now)
  };
}

export async function runCommandTimeoutCheck(options = {}) {
  const executor = options.executor || getPool();
  const now = options.now || new Date();
  const ackTimeoutSec = options.commandAckTimeoutSec ?? env.workers.commandAckTimeoutSec;
  const completeTimeoutSec = options.commandCompleteTimeoutSec ?? env.workers.commandCompleteTimeoutSec;
  const ackThreshold = secondsAgo(ackTimeoutSec, now);
  const completeThreshold = secondsAgo(completeTimeoutSec, now);

  const [pendingPublishedResult] = await executor.execute(
    `UPDATE device_commands
     SET status = 'timeout',
         error_code = ?,
         error_message = ?,
         completed_at = COALESCE(completed_at, NOW())
     WHERE status IN ('pending', 'published')
       AND COALESCE(published_at, created_at) < ?`,
    [ERROR_CODES.COMMAND_ACK_TIMEOUT, ACK_TIMEOUT_MESSAGE, ackThreshold]
  );

  const [acceptedResult] = await executor.execute(
    `UPDATE device_commands
     SET status = 'timeout',
         error_code = ?,
         error_message = ?,
         completed_at = COALESCE(completed_at, NOW())
     WHERE status = 'accepted'
       AND COALESCE(acknowledged_at, published_at, created_at) < ?`,
    [ERROR_CODES.COMMAND_COMPLETE_TIMEOUT, COMPLETE_TIMEOUT_MESSAGE, completeThreshold]
  );

  return {
    pendingPublishedTimedOut: rowCount(pendingPublishedResult),
    acceptedTimedOut: rowCount(acceptedResult),
    ackTimeoutSec,
    completeTimeoutSec,
    checkedAt: now.toISOString()
  };
}

export function createCommandTimeoutWorker() {
  let timer = null;
  let running = false;

  async function tick() {
    if (running) return;
    running = true;
    try {
      const result = await runCommandTimeoutCheck();
      const changed = result.pendingPublishedTimedOut + result.acceptedTimedOut;
      if (changed > 0 || env.workers.logNoopRuns) {
        console.log(
          `[worker:command-timeout] pending/published=${result.pendingPublishedTimedOut}, accepted=${result.acceptedTimedOut}`
        );
      }
    } catch (error) {
      console.error('[worker:command-timeout] failed:', error?.message || error);
    } finally {
      running = false;
    }
  }

  return {
    name: 'command-timeout',
    start() {
      if (!env.workers.commandTimeoutEnabled) {
        console.log('[worker:command-timeout] disabled by COMMAND_TIMEOUT_WORKER_ENABLED=false');
        return;
      }
      if (timer) return;
      const intervalMs = env.workers.commandTimeoutIntervalMs;
      timer = setInterval(tick, intervalMs);
      timer.unref?.();
      console.log(`[worker:command-timeout] started intervalMs=${intervalMs}`);
      if (env.workers.runOnStart) void tick();
    },
    async stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
        console.log('[worker:command-timeout] stopped');
      }
    },
    async runOnce() {
      return runCommandTimeoutCheck();
    }
  };
}

export const __commandTimeoutInternals = {
  ACK_TIMEOUT_MESSAGE,
  COMPLETE_TIMEOUT_MESSAGE,
  secondsAgo,
  rowCount
};
