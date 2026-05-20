import { getPool } from '../config/db.js';
import { badRequestError, notFoundError } from '../utils/errors.js';
import { normalizeDeviceId } from '../utils/normalize.js';
import { flushQueue } from './offlineQueue.service.js';
import { publishFeedOnceCommand } from '../mqtt/mqttPublisher.js';

const BLOCKED_DEVICE_STATUSES = new Set(['disabled', 'revoked']);
const FEEDING_HISTORY_SOURCES = new Set(['remote', 'schedule', 'manual', 'test']);

function nowSql() {
  return new Date();
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const text = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on', 'online'].includes(text)) return true;
  if (['false', '0', 'no', 'off', 'offline'].includes(text)) return false;
  return fallback;
}

function toIntegerOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function toTextOrNull(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
}

function payloadToJson(value) {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

function resolveTopicPayloadDeviceId(topicDeviceId, payload = {}) {
  const normalizedTopicDeviceId = normalizeDeviceId(topicDeviceId);
  const normalizedPayloadDeviceId = payload.deviceId ? normalizeDeviceId(payload.deviceId) : null;

  if (!normalizedTopicDeviceId) {
    throw badRequestError('MQTT topic deviceId is required.', 'MQTT_DEVICE_ID_REQUIRED');
  }

  if (normalizedPayloadDeviceId && normalizedPayloadDeviceId !== normalizedTopicDeviceId) {
    throw badRequestError('MQTT payload deviceId does not match topic deviceId.', 'MQTT_DEVICE_ID_MISMATCH');
  }

  return normalizedTopicDeviceId;
}

async function findDeviceByDeviceId(deviceId, executor, lock = false) {
  const [rows] = await executor.execute(
    `SELECT
      id,
      device_id,
      status,
      active_config_id,
      active_config_version
     FROM devices
     WHERE device_id = ?
     LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
    [deviceId]
  );

  return rows[0] || null;
}

function assertDeviceAvailable(device) {
  if (!device) {
    throw notFoundError('MQTT message device was not found.', 'MQTT_DEVICE_NOT_FOUND');
  }

  if (BLOCKED_DEVICE_STATUSES.has(device.status)) {
    throw badRequestError(`Device is ${device.status}.`, device.status === 'disabled' ? 'DEVICE_DISABLED' : 'DEVICE_REVOKED');
  }
}

function activeConfigPatch(payload = {}) {
  const activeConfigId = toTextOrNull(pickFirst(payload.activeConfigId, payload.configId));
  const activeConfigVersion = toIntegerOrNull(pickFirst(payload.activeConfigVersion, payload.configVersion));

  return {
    activeConfigId,
    activeConfigVersion
  };
}

async function upsertLatestStatus(devicePk, fields, executor) {
  const allowedFields = {
    online: fields.online,
    mode: fields.mode,
    is_feeding: fields.isFeeding,
    door_open: fields.doorOpen,
    wifi_connected: fields.wifiConnected,
    wifi_rssi: fields.wifiRssi,
    ip_address: fields.ipAddress,
    server_connected: fields.serverConnected,
    time_synced: fields.timeSynced,
    epoch: fields.epoch,
    schedule_enabled: fields.scheduleEnabled,
    schedule_count: fields.scheduleCount,
    heap: fields.heap,
    uptime_sec: fields.uptimeSec,
    active_config_id: fields.activeConfigId,
    active_config_version: fields.activeConfigVersion,
    last_seen_at: fields.lastSeenAt,
    last_telemetry_at: fields.lastTelemetryAt,
    updated_at: fields.updatedAt || nowSql()
  };

  const entries = Object.entries(allowedFields).filter(([, value]) => value !== undefined);
  const columns = ['device_id', ...entries.map(([key]) => key)];
  const values = [devicePk, ...entries.map(([, value]) => value)];
  const placeholders = columns.map(() => '?').join(', ');
  const updates = entries.map(([key]) => `${key} = VALUES(${key})`).join(', ');

  await executor.execute(
    `INSERT INTO device_latest_status (${columns.join(', ')})
     VALUES (${placeholders})
     ON DUPLICATE KEY UPDATE ${updates}`,
    values
  );
}

async function patchDeviceActiveConfig(devicePk, activeConfigId, activeConfigVersion, executor) {
  if (!activeConfigId && activeConfigVersion === null) return;

  const assignments = [];
  const values = [];

  if (activeConfigId) {
    assignments.push('active_config_id = ?');
    values.push(activeConfigId);
  }

  if (activeConfigVersion !== null) {
    assignments.push('active_config_version = GREATEST(COALESCE(active_config_version, 0), ?)');
    values.push(activeConfigVersion);
  }

  assignments.push('updated_at = NOW()');
  values.push(devicePk);

  await executor.execute(
    `UPDATE devices SET ${assignments.join(', ')} WHERE id = ?`,
    values
  );
}

async function updateDeviceStatusFromOnline(devicePk, online, executor) {
  const nextStatus = online ? 'online' : 'offline';
  const onlineAtSql = online ? 'last_online_at = NOW(),' : '';
  const offlineAtSql = online ? '' : 'last_offline_at = NOW(),';

  await executor.execute(
    `UPDATE devices
     SET status = CASE
          WHEN status IN ('disabled', 'revoked') THEN status
          ELSE ?
        END,
        last_seen_at = NOW(),
        ${onlineAtSql}
        ${offlineAtSql}
        updated_at = NOW()
     WHERE id = ?`,
    [nextStatus, devicePk]
  );
}

async function updateDeviceLastSeen(devicePk, executor) {
  await executor.execute(
    `UPDATE devices SET last_seen_at = NOW(), updated_at = NOW() WHERE id = ?`,
    [devicePk]
  );
}

async function saveDeviceEvent(devicePk, payload, executor) {
  const eventType = toTextOrNull(pickFirst(payload.event, payload.eventType, payload.type)) || 'unknown';
  const source = toTextOrNull(payload.source);
  const requestId = toTextOrNull(payload.requestId);
  const configId = toTextOrNull(payload.configId);
  const configVersion = toIntegerOrNull(payload.configVersion);
  const deviceEpoch = toIntegerOrNull(payload.epoch);

  await executor.execute(
    `INSERT INTO device_events (
      device_id,
      event_type,
      source,
      request_id,
      config_id,
      config_version,
      payload,
      device_epoch,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      devicePk,
      eventType,
      source,
      requestId,
      configId,
      configVersion,
      payloadToJson(payload),
      deviceEpoch
    ]
  );

  return { eventType, source, requestId, configId, configVersion, deviceEpoch };
}

async function markConfigApplied(devicePk, configId, configVersion, executor) {
  if (!configId && configVersion === null) return;

  if (configId) {
    await executor.execute(
      `UPDATE device_config_generations
       SET status = 'applied'
       WHERE device_id = ? AND config_id = ?`,
      [devicePk, configId]
    );
  } else if (configVersion !== null) {
    await executor.execute(
      `UPDATE device_config_generations
       SET status = 'applied'
       WHERE device_id = ? AND config_version = ?`,
      [devicePk, configVersion]
    );
  }

  await patchDeviceActiveConfig(devicePk, configId, configVersion, executor);

  await upsertLatestStatus(
    devicePk,
    {
      activeConfigId: configId || undefined,
      activeConfigVersion: configVersion ?? undefined,
      lastSeenAt: nowSql(),
      updatedAt: nowSql()
    },
    executor
  );

  await executor.execute(
    `UPDATE devices
     SET status = CASE
          WHEN status = 'online' THEN 'online'
          WHEN status IN ('disabled', 'revoked') THEN status
          ELSE 'configured'
        END,
        last_seen_at = NOW(),
        updated_at = NOW()
     WHERE id = ?`,
    [devicePk]
  );
}

async function updateCommandFromAck(requestId, payload, executor) {
  if (!requestId) return { updated: false };

  const ok = toBoolean(payload.ok, false);
  const nextStatus = ok ? 'accepted' : 'rejected';
  const errorCode = ok ? null : toTextOrNull(pickFirst(payload.error, payload.errorCode)) || 'DEVICE_REJECTED';
  const errorMessage = ok ? null : toTextOrNull(payload.message);

  const [result] = await executor.execute(
    `UPDATE device_commands
     SET status = ?,
         error_code = ?,
         error_message = ?,
         acknowledged_at = NOW()
     WHERE request_id = ?`,
    [nextStatus, errorCode, errorMessage, requestId]
  );

  return {
    updated: Number(result.affectedRows || 0) > 0,
    status: nextStatus,
    errorCode,
    errorMessage
  };
}

async function markCommandAcceptedIfExists(requestId, executor) {
  if (!requestId) return { updated: false };

  const [result] = await executor.execute(
    `UPDATE device_commands
     SET status = CASE WHEN status IN ('pending', 'published') THEN 'accepted' ELSE status END,
         acknowledged_at = COALESCE(acknowledged_at, NOW())
     WHERE request_id = ?`,
    [requestId]
  );

  return { updated: Number(result.affectedRows || 0) > 0 };
}

async function markCommandCompletedIfExists(requestId, executor) {
  if (!requestId) return { updated: false };

  const [result] = await executor.execute(
    `UPDATE device_commands
     SET status = 'completed',
         completed_at = NOW(),
         acknowledged_at = COALESCE(acknowledged_at, NOW())
     WHERE request_id = ?`,
    [requestId]
  );

  return { updated: Number(result.affectedRows || 0) > 0 };
}

function normalizeFeedingSource(source) {
  const normalized = toTextOrNull(source) || 'remote';
  return FEEDING_HISTORY_SOURCES.has(normalized) ? normalized : 'remote';
}

async function insertFeedingHistory(devicePk, payload, executor) {
  const openDurationMs = toIntegerOrNull(payload.openDurationMs);
  if (openDurationMs === null) return { inserted: false, reason: 'missing_open_duration' };

  const source = normalizeFeedingSource(payload.source);
  const requestId = toTextOrNull(payload.requestId);
  const scheduleId = toTextOrNull(pickFirst(payload.scheduleId, payload.mealId));

  await executor.execute(
    `INSERT INTO feeding_histories (
      device_id,
      source,
      request_id,
      schedule_id,
      open_duration_ms,
      started_at,
      finished_at,
      status,
      payload,
      created_at
    ) VALUES (?, ?, ?, ?, ?, NULL, NOW(), 'completed', ?, NOW())`,
    [devicePk, source, requestId, scheduleId, openDurationMs, payloadToJson(payload)]
  );

  return { inserted: true, source, requestId, scheduleId, openDurationMs };
}

export async function handleOnlineMessage({ topicDeviceId, payload = {}, executor = getPool() }) {
  const deviceId = resolveTopicPayloadDeviceId(topicDeviceId, payload);
  const device = await findDeviceByDeviceId(deviceId, executor);
  assertDeviceAvailable(device);

  const online = toBoolean(payload.online, true);
  const epoch = toIntegerOrNull(payload.epoch);
  const uptimeSec = toIntegerOrNull(payload.uptimeSec);
  const { activeConfigId, activeConfigVersion } = activeConfigPatch(payload);
  const seenAt = nowSql();

  await upsertLatestStatus(
    device.id,
    {
      online,
      epoch,
      uptimeSec,
      activeConfigId: activeConfigId || undefined,
      activeConfigVersion: activeConfigVersion ?? undefined,
      lastSeenAt: seenAt,
      updatedAt: seenAt
    },
    executor
  );

  await patchDeviceActiveConfig(device.id, activeConfigId, activeConfigVersion, executor);
  await updateDeviceStatusFromOnline(device.id, online, executor);

  // If device came online, flush the offline command queue (FIFO)
  let flushedCommands = [];
  if (online) {
    console.log('[DEBUG] Device online, flushing queue for devicePk:', device.id);
    flushedCommands = await flushQueue(device.id, executor);
    console.log('[DEBUG] flushedCommands:', flushedCommands);
    for (const cmd of flushedCommands) {
      try {
        await publishFeedOnceCommand(deviceId, {
          requestId: cmd.requestId,
          openDurationMs: cmd.payload?.openDurationMs || 500
        });
      } catch (err) {
        console.error(`[offlineQueue] failed to flush command ${cmd.requestId}:`, err.message);
      }
    }
    if (flushedCommands.length > 0) {
      console.log(`[offlineQueue] flushed ${flushedCommands.length} commands for device ${deviceId}`);
    }
  }

  return { ok: true, type: 'online', deviceId, online, activeConfigId, activeConfigVersion, flushedCommands };
}

export async function handleStateMessage({ topicDeviceId, payload = {}, executor = getPool() }) {
  const deviceId = resolveTopicPayloadDeviceId(topicDeviceId, payload);
  const device = await findDeviceByDeviceId(deviceId, executor);
  assertDeviceAvailable(device);

  const { activeConfigId, activeConfigVersion } = activeConfigPatch(payload);
  const seenAt = nowSql();

  await upsertLatestStatus(
    device.id,
    {
      mode: toTextOrNull(payload.mode),
      isFeeding: payload.isFeeding === undefined ? undefined : toBoolean(payload.isFeeding),
      doorOpen: payload.doorOpen === undefined ? undefined : toBoolean(payload.doorOpen),
      activeConfigId: activeConfigId || undefined,
      activeConfigVersion: activeConfigVersion ?? undefined,
      lastSeenAt: seenAt,
      updatedAt: seenAt
    },
    executor
  );

  await patchDeviceActiveConfig(device.id, activeConfigId, activeConfigVersion, executor);
  await updateDeviceLastSeen(device.id, executor);

  return { ok: true, type: 'state', deviceId, activeConfigId, activeConfigVersion };
}

export async function handleTelemetryMessage({ topicDeviceId, payload = {}, executor = getPool() }) {
  const deviceId = resolveTopicPayloadDeviceId(topicDeviceId, payload);
  const device = await findDeviceByDeviceId(deviceId, executor);
  assertDeviceAvailable(device);

  const { activeConfigId, activeConfigVersion } = activeConfigPatch(payload);
  const seenAt = nowSql();

  await upsertLatestStatus(
    device.id,
    {
      online: true,
      mode: toTextOrNull(payload.mode),
      isFeeding: payload.isFeeding === undefined ? undefined : toBoolean(payload.isFeeding),
      doorOpen: payload.doorOpen === undefined ? undefined : toBoolean(payload.doorOpen),
      wifiConnected: payload.wifiConnected === undefined ? undefined : toBoolean(payload.wifiConnected),
      wifiRssi: toIntegerOrNull(pickFirst(payload.rssi, payload.wifiRssi)),
      ipAddress: toTextOrNull(pickFirst(payload.ip, payload.ipAddress)),
      serverConnected: payload.serverConnected === undefined ? undefined : toBoolean(payload.serverConnected),
      timeSynced: payload.timeSynced === undefined ? undefined : toBoolean(payload.timeSynced),
      epoch: toIntegerOrNull(payload.epoch),
      scheduleEnabled: payload.scheduleEnabled === undefined ? undefined : toBoolean(payload.scheduleEnabled),
      scheduleCount: toIntegerOrNull(payload.scheduleCount),
      heap: toIntegerOrNull(payload.heap),
      uptimeSec: toIntegerOrNull(payload.uptimeSec),
      activeConfigId: activeConfigId || undefined,
      activeConfigVersion: activeConfigVersion ?? undefined,
      lastSeenAt: seenAt,
      lastTelemetryAt: seenAt,
      updatedAt: seenAt
    },
    executor
  );

  await patchDeviceActiveConfig(device.id, activeConfigId, activeConfigVersion, executor);

  await executor.execute(
    `UPDATE devices
     SET status = CASE
          WHEN status IN ('disabled', 'revoked') THEN status
          ELSE 'online'
        END,
        last_seen_at = NOW(),
        last_online_at = COALESCE(last_online_at, NOW()),
        updated_at = NOW()
     WHERE id = ?`,
    [device.id]
  );

  return { ok: true, type: 'telemetry', deviceId, activeConfigId, activeConfigVersion };
}

export async function handleAckMessage({ topicDeviceId, payload = {}, executor = getPool() }) {
  const deviceId = resolveTopicPayloadDeviceId(topicDeviceId, payload);
  const device = await findDeviceByDeviceId(deviceId, executor);
  assertDeviceAvailable(device);

  const requestId = toTextOrNull(payload.requestId);
  if (!requestId) {
    throw badRequestError('MQTT ack requestId is required.', 'MQTT_ACK_REQUEST_ID_REQUIRED');
  }

  const commandResult = await updateCommandFromAck(requestId, payload, executor);
  await updateDeviceLastSeen(device.id, executor);

  return { ok: true, type: 'ack', deviceId, requestId, command: commandResult };
}

export async function handleEventMessage({ topicDeviceId, payload = {}, executor = getPool() }) {
  const deviceId = resolveTopicPayloadDeviceId(topicDeviceId, payload);
  const connection = executor.getConnection ? await executor.getConnection() : null;
  const tx = connection || executor;

  try {
    if (connection) await connection.beginTransaction();

    const device = await findDeviceByDeviceId(deviceId, tx, Boolean(connection));
    assertDeviceAvailable(device);

    const eventRecord = await saveDeviceEvent(device.id, payload, tx);
    const eventType = eventRecord.eventType;
    const seenAt = nowSql();

    await upsertLatestStatus(
      device.id,
      {
        lastSeenAt: seenAt,
        updatedAt: seenAt
      },
      tx
    );
    await updateDeviceLastSeen(device.id, tx);

    let sideEffect = { handled: false };

    if (eventType === 'config_applied') {
      await markConfigApplied(device.id, eventRecord.configId, eventRecord.configVersion, tx);
      sideEffect = {
        handled: true,
        action: 'config_applied',
        configId: eventRecord.configId,
        configVersion: eventRecord.configVersion
      };
    } else if (eventType === 'feed_started') {
      const command = await markCommandAcceptedIfExists(eventRecord.requestId, tx);
      await upsertLatestStatus(
        device.id,
        {
          mode: toTextOrNull(payload.mode) || 'feeding',
          isFeeding: true,
          doorOpen: payload.doorOpen === undefined ? undefined : toBoolean(payload.doorOpen),
          lastSeenAt: seenAt,
          updatedAt: seenAt
        },
        tx
      );
      sideEffect = { handled: true, action: 'feed_started', command };
    } else if (eventType === 'feed_finished') {
      const command = await markCommandCompletedIfExists(eventRecord.requestId, tx);
      const feedingHistory = await insertFeedingHistory(device.id, payload, tx);
      await upsertLatestStatus(
        device.id,
        {
          mode: toTextOrNull(payload.mode) || 'idle',
          isFeeding: false,
          doorOpen: payload.doorOpen === undefined ? undefined : toBoolean(payload.doorOpen, false),
          lastSeenAt: seenAt,
          updatedAt: seenAt
        },
        tx
      );
      sideEffect = { handled: true, action: 'feed_finished', command, feedingHistory };
    }

    if (connection) await connection.commit();

    return { ok: true, type: 'event', deviceId, event: eventRecord, sideEffect };
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

export const __mqttInboundInternals = {
  toBoolean,
  toIntegerOrNull,
  toTextOrNull,
  resolveTopicPayloadDeviceId,
  activeConfigPatch,
  normalizeFeedingSource
};
