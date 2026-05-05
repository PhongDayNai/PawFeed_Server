import { getPool } from '../config/db.js';

function toIso(value) {
  return value ? new Date(value).toISOString() : null;
}

async function scalar(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return Number(rows[0]?.value || 0);
}

function todayStartSql(column) {
  return `${column} >= CURRENT_DATE()`;
}

export async function getAdminDashboard() {
  const [recentEventRows] = await getPool().execute(
    `SELECT e.event_type, e.config_id, e.config_version, e.created_at, d.device_id, d.machine_code
     FROM device_events e
     INNER JOIN devices d ON d.id = e.device_id
     ORDER BY e.created_at DESC, e.id DESC
     LIMIT 10`
  );

  const [recentErrorRows] = await getPool().execute(
    `SELECT e.event_type, e.source, e.created_at, d.device_id, d.machine_code
     FROM device_events e
     INNER JOIN devices d ON d.id = e.device_id
     WHERE e.event_type LIKE '%error%' OR e.event_type LIKE '%failed%'
     ORDER BY e.created_at DESC, e.id DESC
     LIMIT 10`
  );

  return {
    userCount: await scalar('SELECT COUNT(*) AS value FROM users'),
    deviceCount: await scalar('SELECT COUNT(*) AS value FROM devices'),
    onlineDeviceCount: await scalar('SELECT COUNT(*) AS value FROM device_latest_status WHERE online = TRUE'),
    offlineDeviceCount: await scalar(`SELECT COUNT(*) AS value FROM devices d LEFT JOIN device_latest_status s ON s.device_id = d.id WHERE COALESCE(s.online, FALSE) = FALSE`),
    notConfiguredDeviceCount: await scalar("SELECT COUNT(*) AS value FROM devices WHERE status = 'not_configured'"),
    disabledDeviceCount: await scalar("SELECT COUNT(*) AS value FROM devices WHERE status = 'disabled'"),
    revokedDeviceCount: await scalar("SELECT COUNT(*) AS value FROM devices WHERE status = 'revoked'"),
    commandsToday: await scalar(`SELECT COUNT(*) AS value FROM device_commands WHERE ${todayStartSql('created_at')}`),
    feedEventsToday: await scalar(`SELECT COUNT(*) AS value FROM feeding_histories WHERE ${todayStartSql('created_at')}`),
    configGeneratedToday: await scalar(`SELECT COUNT(*) AS value FROM device_config_generations WHERE ${todayStartSql('created_at')}`),
    recentEvents: recentEventRows.map((row) => ({
      deviceId: row.device_id,
      machineCode: row.machine_code,
      eventType: row.event_type,
      configId: row.config_id || null,
      configVersion: row.config_version === null || row.config_version === undefined ? null : Number(row.config_version),
      createdAt: toIso(row.created_at)
    })),
    recentErrors: recentErrorRows.map((row) => ({
      deviceId: row.device_id,
      machineCode: row.machine_code,
      eventType: row.event_type,
      source: row.source || null,
      createdAt: toIso(row.created_at)
    }))
  };
}
