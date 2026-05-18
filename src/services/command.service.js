import { customAlphabet } from 'nanoid';
import { getPool } from '../config/db.js';
import { publishFeedOnceCommand } from '../mqtt/mqttPublisher.js';
import { AppError, badRequestError, notFoundError } from '../utils/errors.js';
import { ERROR_CODES } from '../utils/errorCodes.js';
import { normalizeDeviceId } from '../utils/normalize.js';
import { buildPaginationMeta, paginationFromQuery } from '../utils/pagination.js';
import { assertOwnedDevice } from './device.service.js';
import { writeAuditLog } from './audit.service.js';

const randomId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8);
const BLOCKED_DEVICE_STATUSES = new Set(['disabled', 'revoked']);
const VALID_OPEN_DURATION_MIN_MS = 300;
const VALID_OPEN_DURATION_MAX_MS = 10000;

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

function toCommand(row) {
  return {
    requestId: row.request_id,
    deviceId: row.device_id,
    action: row.action,
    payload: safeJsonParse(row.payload, null),
    status: row.status,
    errorCode: row.error_code || null,
    errorMessage: row.error_message || null,
    requestedByUserId: row.requested_by_user_id === null || row.requested_by_user_id === undefined
      ? null
      : Number(row.requested_by_user_id),
    createdAt: toIso(row.created_at),
    publishedAt: toIso(row.published_at),
    acknowledgedAt: toIso(row.acknowledged_at),
    completedAt: toIso(row.completed_at)
  };
}

function assertDeviceCanReceiveCommand(device) {
  if (BLOCKED_DEVICE_STATUSES.has(device.status)) {
    throw badRequestError(
      `Device is ${device.status} and cannot receive commands.`,
      device.status === 'disabled' ? ERROR_CODES.DEVICE_DISABLED : ERROR_CODES.DEVICE_REVOKED
    );
  }
}

function assertOpenDuration(openDurationMs) {
  const duration = Number(openDurationMs);
  if (!Number.isInteger(duration) || duration < VALID_OPEN_DURATION_MIN_MS || duration > VALID_OPEN_DURATION_MAX_MS) {
    throw badRequestError(
      `Open duration must be between ${VALID_OPEN_DURATION_MIN_MS} and ${VALID_OPEN_DURATION_MAX_MS} ms.`,
      ERROR_CODES.INVALID_OPEN_DURATION
    );
  }
  return duration;
}

export function createCommandRequestId(prefix = 'cmd') {
  return `${prefix}_${Date.now().toString(36)}_${randomId()}`;
}

function commandSelectSql() {
  return `
    SELECT
      c.id,
      c.request_id,
      c.action,
      c.payload,
      c.status,
      c.error_code,
      c.error_message,
      c.requested_by_user_id,
      c.created_at,
      c.published_at,
      c.acknowledged_at,
      c.completed_at,
      d.device_id
    FROM device_commands c
    INNER JOIN devices d ON d.id = c.device_id
  `;
}

async function findCommandByDeviceAndRequestId(devicePk, requestId, executor = getPool()) {
  const [rows] = await executor.execute(
    `${commandSelectSql()}
     WHERE c.device_id = ? AND c.request_id = ?
     LIMIT 1`,
    [devicePk, requestId]
  );

  return rows[0] || null;
}

async function markCommandPublished(commandPk, executor = getPool()) {
  await executor.execute(
    `UPDATE device_commands
     SET status = 'published', published_at = NOW()
     WHERE id = ?`,
    [commandPk]
  );
}

async function markCommandFailed(commandPk, error, executor = getPool()) {
  const code = error instanceof AppError ? error.code : ERROR_CODES.MQTT_PUBLISH_FAILED;
  await executor.execute(
    `UPDATE device_commands
     SET status = 'failed',
         error_code = ?,
         error_message = ?,
         completed_at = NOW()
     WHERE id = ?`,
    [code, error.message || 'Failed to publish command.', commandPk]
  );
}

export async function createFeedNowCommand(deviceId, userId, input, context = {}, options = {}) {
  const connection = await getPool().getConnection();
  const openDurationMs = assertOpenDuration(input.openDurationMs);
  const publisher = options.publisher || publishFeedOnceCommand;
  let commandPk = null;
  let commandRequestId = null;
  let normalizedDeviceId = null;

  try {
    await connection.beginTransaction();

    const device = await assertOwnedDevice(deviceId, userId, connection);
    assertDeviceCanReceiveCommand(device);
    normalizedDeviceId = device.device_id;

    commandRequestId = createCommandRequestId();
    const payload = {
      requestId: commandRequestId,
      action: 'feed_once',
      openDurationMs
    };

    const [insertResult] = await connection.execute(
      `INSERT INTO device_commands (
        device_id,
        requested_by_user_id,
        request_id,
        action,
        payload,
        status,
        created_at
      ) VALUES (?, ?, ?, 'feed_once', ?, 'pending', NOW())`,
      [device.id, userId, commandRequestId, JSON.stringify(payload)]
    );
    commandPk = insertResult.insertId;

    await writeAuditLog({
      actorUserId: userId,
      action: 'user.device.command.feed_now.requested',
      targetType: 'device',
      targetId: normalizedDeviceId,
      payload: {
        requestId: commandRequestId,
        action: 'feed_once',
        openDurationMs
      },
      clientIp: context.clientIp,
      userAgent: context.userAgent,
      connection
    });

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  try {
    await publisher(normalizedDeviceId, { requestId: commandRequestId, openDurationMs });
  } catch (error) {
    await markCommandFailed(commandPk, error);
    throw error;
  }

  await markCommandPublished(commandPk);

  const [rows] = await getPool().execute(
    `${commandSelectSql()}
     WHERE c.id = ?
     LIMIT 1`,
    [commandPk]
  );
  const command = toCommand(rows[0]);

  return {
    ok: true,
    requestId: command.requestId,
    status: command.status,
    command
  };
}

export async function getUserCommandStatus(deviceId, userId, requestId) {
  const device = await assertOwnedDevice(deviceId, userId);
  const row = await findCommandByDeviceAndRequestId(device.id, requestId);

  if (!row) {
    throw notFoundError('Command was not found for this device.', ERROR_CODES.COMMAND_NOT_FOUND);
  }

  return toCommand(row);
}

export async function listUserCommands(deviceId, userId, query = {}) {
  const device = await assertOwnedDevice(deviceId, userId);
  const pagination = paginationFromQuery(query);
  const conditions = ['c.device_id = ?'];
  const values = [device.id];

  if (query.status) {
    conditions.push('c.status = ?');
    values.push(query.status);
  }

  if (query.action) {
    conditions.push('c.action = ?');
    values.push(query.action);
  }

  const whereSql = `WHERE ${conditions.join(' AND ')}`;
  const [countRows] = await getPool().execute(
    `SELECT COUNT(*) AS total FROM device_commands c ${whereSql}`,
    values
  );

  const [rows] = await getPool().execute(
    `${commandSelectSql()}
     ${whereSql}
     ORDER BY c.created_at DESC, c.id DESC
     LIMIT ${pagination.pageSize} OFFSET ${pagination.offset}`,
    values
  );

  return {
    items: rows.map(toCommand),
    pagination: buildPaginationMeta({
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems: Number(countRows[0]?.total || 0)
    })
  };
}

export async function listAdminCommands(query = {}) {
  const pagination = paginationFromQuery(query);
  const conditions = [];
  const values = [];

  if (query.deviceId) {
    conditions.push('d.device_id = ?');
    values.push(normalizeDeviceId(query.deviceId));
  }

  if (query.requestId) {
    conditions.push('c.request_id = ?');
    values.push(query.requestId);
  }

  if (query.status) {
    conditions.push('c.status = ?');
    values.push(query.status);
  }

  if (query.action) {
    conditions.push('c.action = ?');
    values.push(query.action);
  }

  if (query.from) {
    conditions.push('c.created_at >= ?');
    values.push(query.from);
  }

  if (query.to) {
    conditions.push('c.created_at <= ?');
    values.push(query.to);
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const [countRows] = await getPool().execute(
    `SELECT COUNT(*) AS total
     FROM device_commands c
     INNER JOIN devices d ON d.id = c.device_id
     ${whereSql}`,
    values
  );

  const [rows] = await getPool().execute(
    `${commandSelectSql()}
     ${whereSql}
     ORDER BY c.created_at DESC, c.id DESC
     LIMIT ${pagination.pageSize} OFFSET ${pagination.offset}`,
    values
  );

  return {
    items: rows.map(toCommand),
    pagination: buildPaginationMeta({
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems: Number(countRows[0]?.total || 0)
    })
  };
}

export const __commandInternals = {
  assertOpenDuration,
  assertDeviceCanReceiveCommand,
  toCommand,
  createCommandRequestId
};
