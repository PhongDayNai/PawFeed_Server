import { getPool } from '../config/db.js';
import { ERROR_CODES } from '../utils/errorCodes.js';
import { badRequestError, notFoundError } from '../utils/errors.js';
import { normalizeDeviceId } from '../utils/normalize.js';
import { buildPaginationMeta, paginationFromQuery } from '../utils/pagination.js';
import { assertOwnedDevice } from './device.service.js';
import { writeAuditLog } from './audit.service.js';

const CONFIG_GENERATION_TERMINAL_STATUSES = new Set(['applied', 'revoked', 'failed']);

function toBoolean(value) {
  return Boolean(Number(value));
}

function toIso(value) {
  return value ? new Date(value).toISOString() : null;
}

function safeJsonParse(value, fallback = null) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function buildWhere(conditions) {
  return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
}

function applyDateRangeFilter({ conditions, values, column, from, to }) {
  if (from) {
    conditions.push(`${column} >= ?`);
    values.push(from);
  }

  if (to) {
    conditions.push(`${column} <= ?`);
    values.push(to);
  }
}

async function expireGeneratedConfigs(executor = getPool()) {
  await executor.execute(
    `UPDATE device_config_generations
     SET status = 'expired'
     WHERE status = 'generated' AND expires_at < NOW()`
  );
}

function deviceEventSelectSql() {
  return `
    SELECT
      e.id,
      e.event_type,
      e.source,
      e.request_id,
      e.config_id,
      e.config_version,
      e.payload,
      e.device_epoch,
      e.created_at,
      d.device_id,
      d.machine_code
    FROM device_events e
    INNER JOIN devices d ON d.id = e.device_id
  `;
}

function toDeviceEvent(row) {
  return {
    id: Number(row.id),
    deviceId: row.device_id,
    machineCode: row.machine_code,
    eventType: row.event_type,
    source: row.source || null,
    requestId: row.request_id || null,
    configId: row.config_id || null,
    configVersion: row.config_version === null || row.config_version === undefined ? null : Number(row.config_version),
    payload: safeJsonParse(row.payload, null),
    deviceEpoch: row.device_epoch === null || row.device_epoch === undefined ? null : Number(row.device_epoch),
    createdAt: toIso(row.created_at)
  };
}

function feedingHistorySelectSql() {
  return `
    SELECT
      h.id,
      h.source,
      h.request_id,
      h.schedule_id,
      h.open_duration_ms,
      h.started_at,
      h.finished_at,
      h.status,
      h.payload,
      h.created_at,
      d.device_id,
      d.machine_code
    FROM feeding_histories h
    INNER JOIN devices d ON d.id = h.device_id
  `;
}

function toFeedingHistory(row) {
  return {
    id: Number(row.id),
    deviceId: row.device_id,
    machineCode: row.machine_code,
    source: row.source,
    requestId: row.request_id || null,
    scheduleId: row.schedule_id || null,
    openDurationMs: Number(row.open_duration_ms),
    status: row.status,
    startedAt: toIso(row.started_at),
    finishedAt: toIso(row.finished_at),
    payload: safeJsonParse(row.payload, null),
    createdAt: toIso(row.created_at)
  };
}

function configGenerationSelectSql() {
  return `
    SELECT
      g.id,
      g.config_id,
      g.config_version,
      g.config_schema_version,
      g.issued_at,
      g.expires_at,
      g.wifi_ssid,
      g.wifi_password,
      g.address,
      g.address_note,
      g.mqtt_use_tls,
      g.mqtt_port,
      g.keep_setup_ap_enabled,
      g.schedule_enabled,
      g.schedule_item_count,
      g.client_ip,
      g.user_agent,
      g.status,
      g.revoked_at,
      g.revoked_reason,
      g.applied_at,
      g.created_at,
      d.device_id,
      d.machine_code,
      u.id AS generated_by_user_id,
      u.email AS generated_by_email,
      u.full_name AS generated_by_full_name
    FROM device_config_generations g
    INNER JOIN devices d ON d.id = g.device_id
    LEFT JOIN users u ON u.id = g.generated_by_user_id
  `;
}

function toConfigGeneration(row, options = {}) {
  const includeAdminFields = options.includeAdminFields === true;
  return {
    configId: row.config_id,
    configVersion: Number(row.config_version),
    configSchemaVersion: Number(row.config_schema_version),
    deviceId: row.device_id,
    machineCode: row.machine_code,
    issuedAt: toIso(row.issued_at),
    expiresAt: toIso(row.expires_at),
    wifiSsid: row.wifi_ssid,
    hasWifiPassword: Boolean(row.wifi_password && String(row.wifi_password).length > 0),
    address: row.address || null,
    addressNote: row.address_note || null,
    mqttUseTls: toBoolean(row.mqtt_use_tls),
    mqttPort: Number(row.mqtt_port),
    keepSetupApEnabled: toBoolean(row.keep_setup_ap_enabled),
    scheduleEnabled: toBoolean(row.schedule_enabled),
    scheduleItemCount: Number(row.schedule_item_count || 0),
    status: row.status,
    revokedAt: toIso(row.revoked_at),
    revokedReason: row.revoked_reason || null,
    appliedAt: toIso(row.applied_at),
    createdAt: toIso(row.created_at),
    ...(includeAdminFields
      ? {
          generatedBy: row.generated_by_user_id
            ? {
                id: Number(row.generated_by_user_id),
                email: row.generated_by_email,
                fullName: row.generated_by_full_name || null
              }
            : null,
          clientIp: row.client_ip || null,
          userAgent: row.user_agent || null
        }
      : {})
  };
}

export async function listUserDeviceEvents(deviceId, userId, query = {}) {
  const device = await assertOwnedDevice(deviceId, userId);
  const pagination = paginationFromQuery(query);
  const conditions = ['e.device_id = ?'];
  const values = [device.id];

  if (query.eventType) {
    conditions.push('e.event_type = ?');
    values.push(query.eventType);
  }

  if (query.source) {
    conditions.push('e.source = ?');
    values.push(query.source);
  }

  if (query.requestId) {
    conditions.push('e.request_id = ?');
    values.push(query.requestId);
  }

  if (query.configId) {
    conditions.push('e.config_id = ?');
    values.push(query.configId);
  }

  applyDateRangeFilter({ conditions, values, column: 'e.created_at', from: query.from, to: query.to });

  const whereSql = buildWhere(conditions);
  const [countRows] = await getPool().execute(
    `SELECT COUNT(*) AS total
     FROM device_events e
     ${whereSql}`,
    values
  );

  const [rows] = await getPool().execute(
    `${deviceEventSelectSql()}
     ${whereSql}
     ORDER BY e.created_at DESC, e.id DESC
     LIMIT ${pagination.pageSize} OFFSET ${pagination.offset}`,
    values
  );

  return {
    items: rows.map(toDeviceEvent),
    pagination: buildPaginationMeta({
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems: Number(countRows[0]?.total || 0)
    })
  };
}

export async function listAdminDeviceEvents(query = {}) {
  const pagination = paginationFromQuery(query);
  const conditions = [];
  const values = [];

  if (query.deviceId) {
    conditions.push('d.device_id = ?');
    values.push(normalizeDeviceId(query.deviceId));
  }

  if (query.eventType) {
    conditions.push('e.event_type = ?');
    values.push(query.eventType);
  }

  if (query.source) {
    conditions.push('e.source = ?');
    values.push(query.source);
  }

  if (query.requestId) {
    conditions.push('e.request_id = ?');
    values.push(query.requestId);
  }

  if (query.configId) {
    conditions.push('e.config_id = ?');
    values.push(query.configId);
  }

  applyDateRangeFilter({ conditions, values, column: 'e.created_at', from: query.from, to: query.to });

  const whereSql = buildWhere(conditions);
  const [countRows] = await getPool().execute(
    `SELECT COUNT(*) AS total
     FROM device_events e
     INNER JOIN devices d ON d.id = e.device_id
     ${whereSql}`,
    values
  );

  const [rows] = await getPool().execute(
    `${deviceEventSelectSql()}
     ${whereSql}
     ORDER BY e.created_at DESC, e.id DESC
     LIMIT ${pagination.pageSize} OFFSET ${pagination.offset}`,
    values
  );

  return {
    items: rows.map(toDeviceEvent),
    pagination: buildPaginationMeta({
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems: Number(countRows[0]?.total || 0)
    })
  };
}

export async function listUserFeedingHistory(deviceId, userId, query = {}) {
  const device = await assertOwnedDevice(deviceId, userId);
  const pagination = paginationFromQuery(query);
  const conditions = ['h.device_id = ?'];
  const values = [device.id];

  if (query.source) {
    conditions.push('h.source = ?');
    values.push(query.source);
  }

  if (query.status) {
    conditions.push('h.status = ?');
    values.push(query.status);
  }

  if (query.requestId) {
    conditions.push('h.request_id = ?');
    values.push(query.requestId);
  }

  if (query.scheduleId) {
    conditions.push('h.schedule_id = ?');
    values.push(query.scheduleId);
  }

  applyDateRangeFilter({ conditions, values, column: 'COALESCE(h.finished_at, h.started_at, h.created_at)', from: query.from, to: query.to });

  const whereSql = buildWhere(conditions);
  const [countRows] = await getPool().execute(
    `SELECT COUNT(*) AS total
     FROM feeding_histories h
     ${whereSql}`,
    values
  );

  const [rows] = await getPool().execute(
    `${feedingHistorySelectSql()}
     ${whereSql}
     ORDER BY COALESCE(h.finished_at, h.started_at, h.created_at) DESC, h.id DESC
     LIMIT ${pagination.pageSize} OFFSET ${pagination.offset}`,
    values
  );

  return {
    items: rows.map(toFeedingHistory),
    pagination: buildPaginationMeta({
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems: Number(countRows[0]?.total || 0)
    })
  };
}

export async function listAdminFeedingHistories(query = {}) {
  const pagination = paginationFromQuery(query);
  const conditions = [];
  const values = [];

  if (query.deviceId) {
    conditions.push('d.device_id = ?');
    values.push(normalizeDeviceId(query.deviceId));
  }

  if (query.source) {
    conditions.push('h.source = ?');
    values.push(query.source);
  }

  if (query.status) {
    conditions.push('h.status = ?');
    values.push(query.status);
  }

  if (query.requestId) {
    conditions.push('h.request_id = ?');
    values.push(query.requestId);
  }

  if (query.scheduleId) {
    conditions.push('h.schedule_id = ?');
    values.push(query.scheduleId);
  }

  applyDateRangeFilter({ conditions, values, column: 'COALESCE(h.finished_at, h.started_at, h.created_at)', from: query.from, to: query.to });

  const whereSql = buildWhere(conditions);
  const [countRows] = await getPool().execute(
    `SELECT COUNT(*) AS total
     FROM feeding_histories h
     INNER JOIN devices d ON d.id = h.device_id
     ${whereSql}`,
    values
  );

  const [rows] = await getPool().execute(
    `${feedingHistorySelectSql()}
     ${whereSql}
     ORDER BY COALESCE(h.finished_at, h.started_at, h.created_at) DESC, h.id DESC
     LIMIT ${pagination.pageSize} OFFSET ${pagination.offset}`,
    values
  );

  return {
    items: rows.map(toFeedingHistory),
    pagination: buildPaginationMeta({
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems: Number(countRows[0]?.total || 0)
    })
  };
}

export async function listUserConfigGenerations(deviceId, userId, query = {}) {
  await expireGeneratedConfigs();
  const device = await assertOwnedDevice(deviceId, userId);
  const pagination = paginationFromQuery(query);
  const conditions = ['g.device_id = ?'];
  const values = [device.id];

  if (query.status) {
    conditions.push('g.status = ?');
    values.push(query.status);
  }

  if (query.configId) {
    conditions.push('g.config_id = ?');
    values.push(query.configId);
  }

  applyDateRangeFilter({ conditions, values, column: 'g.created_at', from: query.from, to: query.to });

  const whereSql = buildWhere(conditions);
  const [countRows] = await getPool().execute(
    `SELECT COUNT(*) AS total
     FROM device_config_generations g
     ${whereSql}`,
    values
  );

  const [rows] = await getPool().execute(
    `${configGenerationSelectSql()}
     ${whereSql}
     ORDER BY g.config_version DESC, g.id DESC
     LIMIT ${pagination.pageSize} OFFSET ${pagination.offset}`,
    values
  );

  return {
    items: rows.map((row) => toConfigGeneration(row, { includeAdminFields: false })),
    pagination: buildPaginationMeta({
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems: Number(countRows[0]?.total || 0)
    })
  };
}

export async function listAdminConfigGenerations(query = {}) {
  await expireGeneratedConfigs();
  const pagination = paginationFromQuery(query);
  const conditions = [];
  const values = [];

  if (query.deviceId) {
    conditions.push('d.device_id = ?');
    values.push(normalizeDeviceId(query.deviceId));
  }

  if (query.configId) {
    conditions.push('g.config_id = ?');
    values.push(query.configId);
  }

  if (query.status) {
    conditions.push('g.status = ?');
    values.push(query.status);
  }

  applyDateRangeFilter({ conditions, values, column: 'g.created_at', from: query.from, to: query.to });

  const whereSql = buildWhere(conditions);
  const [countRows] = await getPool().execute(
    `SELECT COUNT(*) AS total
     FROM device_config_generations g
     INNER JOIN devices d ON d.id = g.device_id
     ${whereSql}`,
    values
  );

  const [rows] = await getPool().execute(
    `${configGenerationSelectSql()}
     ${whereSql}
     ORDER BY g.created_at DESC, g.id DESC
     LIMIT ${pagination.pageSize} OFFSET ${pagination.offset}`,
    values
  );

  return {
    items: rows.map((row) => toConfigGeneration(row, { includeAdminFields: true })),
    pagination: buildPaginationMeta({
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems: Number(countRows[0]?.total || 0)
    })
  };
}

export async function getAdminConfigGeneration(configId) {
  await expireGeneratedConfigs();
  const [rows] = await getPool().execute(
    `${configGenerationSelectSql()}
     WHERE g.config_id = ?
     LIMIT 1`,
    [configId]
  );

  if (!rows[0]) {
    throw notFoundError('Config generation was not found.', ERROR_CODES.CONFIG_GENERATION_NOT_FOUND || ERROR_CODES.CONFIG_GENERATION_FAILED);
  }

  return toConfigGeneration(rows[0], { includeAdminFields: true });
}

export async function revokeAdminConfigGeneration(configId, adminUserId, context = {}) {
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `${configGenerationSelectSql()}
       WHERE g.config_id = ?
       LIMIT 1
       FOR UPDATE`,
      [configId]
    );

    const row = rows[0];
    if (!row) {
      throw notFoundError('Config generation was not found.', ERROR_CODES.CONFIG_GENERATION_NOT_FOUND || ERROR_CODES.CONFIG_GENERATION_FAILED);
    }

    if (CONFIG_GENERATION_TERMINAL_STATUSES.has(row.status)) {
      throw badRequestError(
        `Config generation is already ${row.status}.`,
        row.status === 'revoked' ? ERROR_CODES.CONFIG_ALREADY_REVOKED : ERROR_CODES.INVALID_CONFIG_GENERATION_STATUS
      );
    }

    await connection.execute(
      `UPDATE device_config_generations
       SET status = 'revoked', revoked_at = NOW(), revoked_reason = ?
       WHERE config_id = ?`,
      [context.reason || null, configId]
    );

    // Update row in memory with new values so toConfigGeneration sees them
    row.status = 'revoked';
    row.revoked_at = new Date();
    row.revoked_reason = context.reason || null;

    await writeAuditLog({
      actorUserId: adminUserId,
      action: 'admin.config_generation.revoke',
      targetType: 'config_generation',
      targetId: configId,
      payload: {
        configId,
        previousStatus: row.status,
        deviceId: row.device_id,
        machineCode: row.machine_code,
        serverSideOnly: true
      },
      clientIp: context.clientIp,
      userAgent: context.userAgent,
      connection
    });

    await connection.commit();

    return {
      ...toConfigGeneration({ ...row, status: 'revoked' }, { includeAdminFields: true }),
      revokeNote: 'Config was revoked on the server side. If the file was already downloaded, the current Machine firmware does not ask the server before applying it.'
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export const __phase13Internals = {
  toDeviceEvent,
  toFeedingHistory,
  toConfigGeneration,
  expireGeneratedConfigs
};
