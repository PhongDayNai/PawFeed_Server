import { getPool } from '../config/db.js';
import { notFoundError, conflictError } from '../utils/errors.js';
import { ERROR_CODES } from '../utils/errorCodes.js';
import { assertOwnedDevice } from './device.service.js';

function safeJsonParse(value, fallback = null) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toQueueItem(row) {
  return {
    requestId: row.request_id,
    action: row.action,
    payload: safeJsonParse(row.payload, null),
    queuedAt: row.queued_at ? new Date(row.queued_at).toISOString() : null,
    status: row.status,
    position: row.position
  };
}

export async function enqueueCommand(devicePk, requestId, action, payload, executor = getPool()) {
  const [result] = await executor.execute(
    `UPDATE device_commands
     SET status = 'queued',
         queued_at = NOW()
     WHERE device_id = ? AND request_id = ? AND status = 'pending'`,
    [devicePk, requestId]
  );
  return result.affectedRows > 0;
}

export async function listQueue(devicePk, executor = getPool()) {
  const [rows] = await executor.execute(
    `SELECT
       c.request_id,
       c.action,
       c.payload,
       c.status,
       c.queued_at,
       c.created_at,
       (@row := @row + 1) AS position
     FROM device_commands c
     CROSS JOIN (SELECT @row := 0) AS r
     WHERE c.device_id = ? AND c.status = 'queued'
     ORDER BY c.queued_at ASC, c.id ASC`,
    [devicePk]
  );

  return rows.map((row, index) => ({
    requestId: row.request_id,
    action: row.action,
    payload: safeJsonParse(row.payload, null),
    queuedAt: row.queued_at ? new Date(row.queued_at).toISOString() : null,
    status: row.status,
    position: index + 1
  }));
}

export async function removeFromQueue(devicePk, requestId, executor = getPool()) {
  const [result] = await executor.execute(
    `DELETE FROM device_commands
     WHERE device_id = ? AND request_id = ? AND status = 'queued'`,
    [devicePk, requestId]
  );

  if (result.affectedRows === 0) {
    const [existing] = await executor.execute(
      `SELECT status FROM device_commands WHERE device_id = ? AND request_id = ?`,
      [devicePk, requestId]
    );

    if (existing.length === 0) {
      throw notFoundError(
        'Command is not in the queue or already executed',
        ERROR_CODES.COMMAND_NOT_IN_QUEUE
      );
    }

    const command = existing[0];
    if (command.status !== 'queued') {
      throw conflictError(
        'Command has already been executed',
        ERROR_CODES.COMMAND_ALREADY_EXECUTED
      );
    }
  }

  return { ok: true };
}

export async function flushQueue(devicePk, executor = getPool()) {
  const [rows] = await executor.execute(
    `SELECT id, request_id, action, payload
     FROM device_commands
     WHERE device_id = ? AND status = 'queued'
     ORDER BY queued_at ASC, id ASC
     FOR UPDATE`,
    [devicePk]
  );

  const flushed = [];
  for (const row of rows) {
    await executor.execute(
      `UPDATE device_commands SET status = 'pending', queued_at = NULL WHERE id = ?`,
      [row.id]
    );
    flushed.push({
      requestId: row.request_id,
      action: row.action,
      payload: safeJsonParse(row.payload, null)
    });
  }

  return flushed;
}

export async function getQueuedCommand(devicePk, requestId, executor = getPool()) {
  const [rows] = await executor.execute(
    `SELECT request_id, action, payload, status, queued_at
     FROM device_commands
     WHERE device_id = ? AND request_id = ? AND status = 'queued'
     LIMIT 1`,
    [devicePk, requestId]
  );

  if (rows.length === 0) return null;
  return toQueueItem(rows[0]);
}

export async function getUserQueue(deviceId, userId) {
  const device = await assertOwnedDevice(deviceId, userId);
  return listQueue(device.id);
}

export async function removeUserFromQueue(deviceId, userId, requestId) {
  const device = await assertOwnedDevice(deviceId, userId);
  return removeFromQueue(device.id, requestId);
}