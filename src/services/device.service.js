import { getPool } from '../config/db.js';
import {
  badRequestError,
  conflictError,
  forbiddenError,
  notFoundError
} from '../utils/errors.js';
import {
  emptyToNull,
  normalizeDeviceId,
  normalizeMachineCode,
  normalizePairingCode
} from '../utils/normalize.js';
import { writeAuditLog } from './audit.service.js';
import { buildPaginationMeta, paginationFromQuery } from '../utils/pagination.js';

const blockedDeviceStatuses = new Set(['disabled', 'revoked']);

function toBoolean(value) {
  return Boolean(Number(value));
}

function toIso(value) {
  return value ? new Date(value).toISOString() : null;
}

function pairingCodeComparable(value) {
  return normalizePairingCode(value).replace(/[-\s]/g, '');
}

function isSamePairingCode(inputCode, storedCode) {
  return pairingCodeComparable(inputCode) === pairingCodeComparable(storedCode);
}

function toUserDevice(row) {
  return {
    deviceId: row.device_id,
    machineCode: row.machine_code,
    displayName: row.display_name,
    status: row.status,
    firmwareVersion: row.firmware_version,
    online: toBoolean(row.online),
    lastSeenAt: toIso(row.last_seen_at || row.device_last_seen_at),
    activeConfigId: row.active_config_id,
    activeConfigVersion: Number(row.active_config_version || 0),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

function toUserDeviceDetail(row) {
  return {
    ...toUserDevice(row),
    lastOnlineAt: toIso(row.last_online_at),
    lastOfflineAt: toIso(row.last_offline_at)
  };
}

function toUserDeviceStatus(row, deviceId) {
  return {
    deviceId,
    online: toBoolean(row?.online),
    mode: row?.mode || null,
    isFeeding: toBoolean(row?.is_feeding),
    doorOpen: toBoolean(row?.door_open),
    wifiConnected: toBoolean(row?.wifi_connected),
    wifiRssi: row?.wifi_rssi === null || row?.wifi_rssi === undefined ? null : Number(row.wifi_rssi),
    ipAddress: row?.ip_address || null,
    serverConnected: toBoolean(row?.server_connected),
    timeSynced: toBoolean(row?.time_synced),
    epoch: row?.epoch === null || row?.epoch === undefined ? null : Number(row.epoch),
    scheduleEnabled: toBoolean(row?.schedule_enabled),
    scheduleCount: Number(row?.schedule_count || 0),
    heap: row?.heap === null || row?.heap === undefined ? null : Number(row.heap),
    uptimeSec: row?.uptime_sec === null || row?.uptime_sec === undefined ? null : Number(row.uptime_sec),
    activeConfigId: row?.active_config_id || null,
    activeConfigVersion: Number(row?.active_config_version || 0),
    lastSeenAt: toIso(row?.last_seen_at),
    lastTelemetryAt: toIso(row?.last_telemetry_at),
    updatedAt: toIso(row?.updated_at)
  };
}

function baseUserDeviceSelect() {
  return `
    SELECT
      d.id,
      d.device_id,
      d.machine_code,
      d.display_name,
      d.owner_user_id,
      d.firmware_version,
      d.status,
      d.active_config_id,
      d.active_config_version,
      d.last_seen_at AS device_last_seen_at,
      d.last_online_at,
      d.last_offline_at,
      d.created_at,
      d.updated_at,
      ls.online,
      ls.last_seen_at,
      ls.last_telemetry_at
    FROM devices d
    LEFT JOIN device_latest_status ls ON ls.device_id = d.id
  `;
}

async function insertLinkHistory({
  devicePk = null,
  userId = null,
  machineCode,
  pairingCode = null,
  action,
  clientIp = null,
  userAgent = null,
  connection = null
}) {
  const executor = connection || getPool();
  await executor.execute(
    `INSERT INTO device_link_histories (
      device_id,
      user_id,
      machine_code,
      pairing_code_used,
      action,
      client_ip,
      user_agent,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [devicePk, userId, machineCode, pairingCode, action, clientIp, userAgent]
  );
}

async function findDeviceForLink(machineCode, connection) {
  const [rows] = await connection.execute(
    `SELECT id, device_id, machine_code, claim_code, claim_code_used_at, owner_user_id, status
     FROM devices
     WHERE machine_code = ?
     LIMIT 1
     FOR UPDATE`,
    [machineCode]
  );
  return rows[0] || null;
}

export async function findOwnedDeviceByDeviceId(deviceId, userId, connection = null) {
  const executor = connection || getPool();
  const normalizedDeviceId = normalizeDeviceId(deviceId);
  const [rows] = await executor.execute(
    `${baseUserDeviceSelect()}
     WHERE d.device_id = ? AND d.owner_user_id = ?
     LIMIT 1`,
    [normalizedDeviceId, userId]
  );
  return rows[0] || null;
}

export async function assertOwnedDevice(deviceId, userId, connection = null) {
  const row = await findOwnedDeviceByDeviceId(deviceId, userId, connection);
  if (!row) {
    throw notFoundError('Device was not found for this account.', 'DEVICE_NOT_FOUND');
  }
  return row;
}

export async function linkDeviceToUser(input, context) {
  const connection = await getPool().getConnection();
  const userId = context.actorUserId;
  const machineCode = normalizeMachineCode(input.machineCode);
  const pairingCode = normalizePairingCode(input.pairingCode);

  if (!machineCode) {
    throw badRequestError('Machine code is required.', 'MACHINE_CODE_REQUIRED');
  }

  if (!pairingCode) {
    throw badRequestError('Pairing code is required.', 'PAIRING_CODE_REQUIRED');
  }

  try {
    await connection.beginTransaction();

    const device = await findDeviceForLink(machineCode, connection);

    if (!device) {
      await insertLinkHistory({
        userId,
        machineCode,
        pairingCode,
        action: 'failed_not_found',
        clientIp: context.clientIp,
        userAgent: context.userAgent,
        connection
      });
      throw notFoundError('Không tìm thấy mã máy này.', 'MACHINE_CODE_NOT_FOUND');
    }

    if (blockedDeviceStatuses.has(device.status)) {
      await insertLinkHistory({
        devicePk: device.id,
        userId,
        machineCode: device.machine_code,
        pairingCode,
        action: `failed_${device.status}`,
        clientIp: context.clientIp,
        userAgent: context.userAgent,
        connection
      });
      throw forbiddenError('Device is not available for linking.', 'DEVICE_NOT_AVAILABLE');
    }

    if (device.owner_user_id && Number(device.owner_user_id) === Number(userId)) {
      await insertLinkHistory({
        devicePk: device.id,
        userId,
        machineCode: device.machine_code,
        pairingCode,
        action: 'already_owned',
        clientIp: context.clientIp,
        userAgent: context.userAgent,
        connection
      });
      await connection.commit();
      const row = await findOwnedDeviceByDeviceId(device.device_id, userId);
      return {
        device: toUserDeviceDetail(row),
        alreadyLinked: true,
        message: 'Device already linked to this account.'
      };
    }

    if (device.owner_user_id) {
      await insertLinkHistory({
        devicePk: device.id,
        userId,
        machineCode: device.machine_code,
        pairingCode,
        action: 'failed_already_linked',
        clientIp: context.clientIp,
        userAgent: context.userAgent,
        connection
      });
      throw conflictError('Thiết bị này đã được liên kết với tài khoản khác.', 'DEVICE_ALREADY_LINKED');
    }

    if (!device.claim_code || !isSamePairingCode(pairingCode, device.claim_code)) {
      await insertLinkHistory({
        devicePk: device.id,
        userId,
        machineCode: device.machine_code,
        pairingCode,
        action: 'failed_invalid_pairing_code',
        clientIp: context.clientIp,
        userAgent: context.userAgent,
        connection
      });
      throw badRequestError('Mã ghép nối không đúng.', 'INVALID_PAIRING_CODE');
    }

    if (device.claim_code_used_at) {
      await insertLinkHistory({
        devicePk: device.id,
        userId,
        machineCode: device.machine_code,
        pairingCode,
        action: 'failed_pairing_code_used',
        clientIp: context.clientIp,
        userAgent: context.userAgent,
        connection
      });
      throw conflictError('Mã ghép nối này đã được sử dụng.', 'PAIRING_CODE_ALREADY_USED');
    }

    await connection.execute(
      `UPDATE devices
       SET owner_user_id = ?, claim_code_used_at = NOW(), status = 'linked', updated_at = NOW()
       WHERE id = ?`,
      [userId, device.id]
    );

    await insertLinkHistory({
      devicePk: device.id,
      userId,
      machineCode: device.machine_code,
      pairingCode,
      action: 'linked',
      clientIp: context.clientIp,
      userAgent: context.userAgent,
      connection
    });

    await writeAuditLog({
      actorUserId: userId,
      action: 'user.device.link',
      targetType: 'device',
      targetId: device.device_id,
      payload: {
        deviceId: device.device_id,
        machineCode: device.machine_code
      },
      clientIp: context.clientIp,
      userAgent: context.userAgent,
      connection
    });

    await connection.commit();

    const linkedRow = await findOwnedDeviceByDeviceId(device.device_id, userId);
    return {
      device: toUserDeviceDetail(linkedRow),
      alreadyLinked: false
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listUserDevices(userId, query = {}) {
  const pagination = paginationFromQuery(query);
  const conditions = ['d.owner_user_id = ?'];
  const values = [userId];

  if (query.status) {
    conditions.push('d.status = ?');
    values.push(query.status);
  }

  if (query.online !== undefined) {
    conditions.push('COALESCE(ls.online, 0) = ?');
    values.push(query.online ? 1 : 0);
  }

  if (query.search) {
    conditions.push('(d.device_id LIKE ? OR d.machine_code LIKE ? OR d.display_name LIKE ?)');
    const searchTerm = `%${query.search}%`;
    values.push(searchTerm, searchTerm, searchTerm);
  }

  const whereSql = `WHERE ${conditions.join(' AND ')}`;
  const [countRows] = await getPool().execute(
    `SELECT COUNT(*) AS total
     FROM devices d
     LEFT JOIN device_latest_status ls ON ls.device_id = d.id
     ${whereSql}`,
    values
  );

  const [rows] = await getPool().execute(
    `${baseUserDeviceSelect()}
     ${whereSql}
     ORDER BY COALESCE(ls.last_seen_at, d.last_seen_at, d.updated_at, d.created_at) DESC, d.id DESC
     LIMIT ${pagination.limit} OFFSET ${pagination.offset}`,
    values
  );

  return {
    items: rows.map((row) => toUserDevice(row)),
    pagination: buildPaginationMeta({
      page: pagination.page,
      limit: pagination.limit,
      total: Number(countRows[0]?.total || 0)
    })
  };
}

export async function getUserDevice(deviceId, userId) {
  const row = await assertOwnedDevice(deviceId, userId);
  return toUserDeviceDetail(row);
}

export async function getUserDeviceStatus(deviceId, userId) {
  const device = await assertOwnedDevice(deviceId, userId);
  const [rows] = await getPool().execute(
    `SELECT
      online,
      mode,
      is_feeding,
      door_open,
      wifi_connected,
      wifi_rssi,
      ip_address,
      server_connected,
      time_synced,
      epoch,
      schedule_enabled,
      schedule_count,
      heap,
      uptime_sec,
      active_config_id,
      active_config_version,
      last_seen_at,
      last_telemetry_at,
      updated_at
     FROM device_latest_status
     WHERE device_id = ?
     LIMIT 1`,
    [device.id]
  );

  return toUserDeviceStatus(rows[0], device.device_id);
}

export async function updateUserDevice(deviceId, userId, input, context) {
  const connection = await getPool().getConnection();
  const displayName = input.displayName === undefined ? undefined : emptyToNull(input.displayName);

  try {
    await connection.beginTransaction();
    const device = await assertOwnedDevice(deviceId, userId, connection);

    if (displayName !== undefined) {
      await connection.execute(
        `UPDATE devices SET display_name = ?, updated_at = NOW() WHERE id = ?`,
        [displayName, device.id]
      );
    }

    await writeAuditLog({
      actorUserId: userId,
      action: 'user.device.update',
      targetType: 'device',
      targetId: device.device_id,
      payload: {
        displayNameUpdated: displayName !== undefined
      },
      clientIp: context.clientIp,
      userAgent: context.userAgent,
      connection
    });

    await connection.commit();
    const updated = await findOwnedDeviceByDeviceId(device.device_id, userId);
    return toUserDeviceDetail(updated);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function unlinkUserDevice(deviceId, userId, context) {
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();
    const device = await assertOwnedDevice(deviceId, userId, connection);

    await connection.execute(
      `UPDATE devices
       SET owner_user_id = NULL, status = 'unlinked', updated_at = NOW()
       WHERE id = ?`,
      [device.id]
    );

    await insertLinkHistory({
      devicePk: device.id,
      userId,
      machineCode: device.machine_code,
      pairingCode: null,
      action: 'unlinked',
      clientIp: context.clientIp,
      userAgent: context.userAgent,
      connection
    });

    await writeAuditLog({
      actorUserId: userId,
      action: 'user.device.unlink',
      targetType: 'device',
      targetId: device.device_id,
      payload: {
        deviceId: device.device_id,
        machineCode: device.machine_code
      },
      clientIp: context.clientIp,
      userAgent: context.userAgent,
      connection
    });

    await connection.commit();
    return {
      ok: true,
      deviceId: device.device_id,
      message: 'Device unlinked. Pairing code remains used until an admin rotates it.'
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
