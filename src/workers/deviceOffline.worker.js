import { getPool } from '../config/db.js';
import { env } from '../config/env.js';
import { getWorkerTimeoutSettings } from '../services/systemSettings.service.js';

function secondsAgo(seconds, now = new Date()) {
  return new Date(now.getTime() - seconds * 1000);
}

function rowCount(result) {
  return Number(result?.affectedRows || 0);
}

export async function getDeviceOfflineThreshold(now = new Date(), executor = undefined) {
  const settings = executor ? await getWorkerTimeoutSettings(executor) : env.workers;
  return secondsAgo(settings.deviceOnlineTtlSec, now);
}

export async function runDeviceOfflineCheck(options = {}) {
  const executor = options.executor || getPool();
  const now = options.now || new Date();
  const settings = await getWorkerTimeoutSettings(executor);
  const onlineTtlSec = options.deviceOnlineTtlSec ?? settings.deviceOnlineTtlSec;
  const threshold = secondsAgo(onlineTtlSec, now);

  const [latestStatusResult] = await executor.execute(
    `UPDATE device_latest_status ls
     INNER JOIN devices d ON d.id = ls.device_id
     SET ls.online = FALSE,
         ls.updated_at = NOW(),
         d.last_offline_at = CASE
           WHEN d.status = 'online' THEN NOW()
           ELSE d.last_offline_at
         END,
         d.status = CASE
           WHEN d.status IN ('disabled', 'revoked') THEN d.status
           ELSE 'offline'
         END,
         d.updated_at = NOW()
     WHERE ls.online = TRUE
       AND d.status NOT IN ('disabled', 'revoked')
       AND COALESCE(ls.last_telemetry_at, ls.last_seen_at, d.last_seen_at, d.last_online_at, d.updated_at, d.created_at) < ?`,
    [threshold]
  );

  return {
    devicesMarkedOffline: rowCount(latestStatusResult),
    onlineTtlSec,
    checkedAt: now.toISOString()
  };
}

export function createDeviceOfflineWorker() {
  let timer = null;
  let running = false;

  async function tick() {
    if (running) return;
    running = true;
    try {
      const result = await runDeviceOfflineCheck();
      if (result.devicesMarkedOffline > 0 || env.workers.logNoopRuns) {
        console.log(`[worker:device-offline] markedOffline=${result.devicesMarkedOffline}`);
      }
    } catch (error) {
      console.error('[worker:device-offline] failed:', error?.message || error);
    } finally {
      running = false;
    }
  }

  return {
    name: 'device-offline',
    start() {
      if (!env.workers.deviceOfflineEnabled) {
        console.log('[worker:device-offline] disabled by DEVICE_OFFLINE_WORKER_ENABLED=false');
        return;
      }
      if (timer) return;
      const intervalMs = env.workers.deviceOfflineIntervalMs;
      timer = setInterval(tick, intervalMs);
      timer.unref?.();
      console.log(`[worker:device-offline] started intervalMs=${intervalMs}`);
      if (env.workers.runOnStart) void tick();
    },
    async stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
        console.log('[worker:device-offline] stopped');
      }
    },
    async runOnce() {
      return runDeviceOfflineCheck();
    }
  };
}

export const __deviceOfflineInternals = {
  secondsAgo,
  rowCount
};
