import { getPool } from '../config/db.js';

const RECENT_LIMIT = 5;

function toBoolean(value) {
  return Boolean(Number(value));
}

function toIso(value) {
  return value ? new Date(value).toISOString() : null;
}

function toRecentDevice(row) {
  return {
    deviceId: row.device_id,
    machineCode: row.machine_code,
    displayName: row.display_name || null,
    online: toBoolean(row.online),
    status: row.status,
    activeConfigId: row.active_config_id || null,
    activeConfigVersion: Number(row.active_config_version || 0),
    lastSeenAt: toIso(row.last_seen_at || row.device_last_seen_at)
  };
}

function toRecentFeedingHistory(row) {
  return {
    id: Number(row.id),
    deviceId: row.device_id,
    machineCode: row.machine_code,
    source: row.source,
    openDurationMs: Number(row.open_duration_ms),
    status: row.status,
    startedAt: toIso(row.started_at),
    finishedAt: toIso(row.finished_at),
    createdAt: toIso(row.created_at)
  };
}

export async function getUserDashboard(userId) {
  const pool = getPool();

  const [[deviceSummary]] = await pool.execute(
    `SELECT
       COUNT(*) AS device_count,
       SUM(CASE WHEN COALESCE(ls.online, 0) = 1 THEN 1 ELSE 0 END) AS online_count,
       SUM(CASE WHEN COALESCE(ls.is_feeding, 0) = 1 THEN 1 ELSE 0 END) AS feeding_count,
       SUM(CASE WHEN d.status = 'not_configured' THEN 1 ELSE 0 END) AS not_configured_count
     FROM devices d
     LEFT JOIN device_latest_status ls ON ls.device_id = d.id
     WHERE d.owner_user_id = ?`,
    [userId]
  );

  const deviceCount = Number(deviceSummary?.device_count || 0);
  const onlineCount = Number(deviceSummary?.online_count || 0);
  const feedingCount = Number(deviceSummary?.feeding_count || 0);
  const notConfiguredCount = Number(deviceSummary?.not_configured_count || 0);
  const offlineCount = Math.max(deviceCount - onlineCount, 0);

  const [recentDeviceRows] = await pool.execute(
    `SELECT
       d.device_id,
       d.machine_code,
       d.display_name,
       d.status,
       d.active_config_id,
       d.active_config_version,
       d.last_seen_at AS device_last_seen_at,
       ls.online,
       ls.last_seen_at
     FROM devices d
     LEFT JOIN device_latest_status ls ON ls.device_id = d.id
     WHERE d.owner_user_id = ?
     ORDER BY COALESCE(ls.last_seen_at, d.last_seen_at, d.updated_at, d.created_at) DESC, d.id DESC
     LIMIT ${RECENT_LIMIT}`,
    [userId]
  );

  const [recentFeedingRows] = await pool.execute(
    `SELECT
       h.id,
       h.source,
       h.open_duration_ms,
       h.status,
       h.started_at,
       h.finished_at,
       h.created_at,
       d.device_id,
       d.machine_code
     FROM feeding_histories h
     INNER JOIN devices d ON d.id = h.device_id
     WHERE d.owner_user_id = ?
     ORDER BY COALESCE(h.started_at, h.created_at) DESC, h.id DESC
     LIMIT ${RECENT_LIMIT}`,
    [userId]
  );

  return {
    deviceCount,
    onlineCount,
    offlineCount,
    feedingCount,
    notConfiguredCount,
    recentDevices: recentDeviceRows.map(toRecentDevice),
    recentFeedingHistories: recentFeedingRows.map(toRecentFeedingHistory)
  };
}
