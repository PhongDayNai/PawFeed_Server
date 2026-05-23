import { getPool } from '../config/db.js';
import {
  badRequestError,
  conflictError,
  notFoundError
} from '../utils/errors.js';
import {
  createDeviceId,
  createDeviceSecret,
  createMachineCode,
  createMqttPassword,
  createPairingCode,
  maskPairingCode,
  maskSecret
} from '../utils/crypto.js';
import {
  emptyToNull,
  normalizeDeviceId,
  normalizeMachineCode,
  normalizePairingCode
} from '../utils/normalize.js';
import { buildPaginationMeta, paginationFromQuery } from '../utils/pagination.js';
import { writeAuditLog } from './audit.service.js';
import { syncPassword, deleteCredential } from './mqttPasswordSync.service.js';

const deviceStatusSet = new Set([
  'not_configured',
  'linked',
  'config_generated',
  'configured',
  'online',
  'offline',
  'disabled',
  'revoked',
  'unlinked'
]);

function normalizeStatus(status) {
  const normalized = status || 'not_configured';
  if (!deviceStatusSet.has(normalized)) {
    throw badRequestError('Invalid device status.', 'INVALID_DEVICE_STATUS');
  }
  return normalized;
}

function buildQrPayload(device) {
  return {
    type: 'pet_feeder_machine',
    version: 1,
    machineCode: device.machine_code,
    pairingCode: device.claim_code
  };
}

function toBoolean(value) {
  return Boolean(Number(value));
}

function toIso(value) {
  return value ? new Date(value).toISOString() : null;
}

function toAdminDevice(row, { includeQrPayload = false, includePairingCode = false } = {}) {
  const device = {
    id: Number(row.id),
    deviceId: row.device_id,
    machineCode: row.machine_code,
    displayName: row.display_name,
    firmwareVersion: row.firmware_version,
    status: row.status,
    ownerUserId: row.owner_user_id === null ? null : Number(row.owner_user_id),
    owner: row.owner_email
      ? {
          id: Number(row.owner_user_id),
          fullName: row.owner_full_name,
          email: row.owner_email
        }
      : null,
    activeConfigId: row.active_config_id,
    activeConfigVersion: Number(row.active_config_version || 0),
    pairingCodeMasked: maskPairingCode(row.claim_code),
    pairingCodeUsedAt: toIso(row.claim_code_used_at),
    pairingCodeRotatedAt: toIso(row.claim_code_rotated_at),
    lastSeenAt: toIso(row.last_seen_at),
    lastOnlineAt: toIso(row.last_online_at),
    lastOfflineAt: toIso(row.last_offline_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    latestStatus: row.latest_status_device_id
      ? {
          online: toBoolean(row.online),
          mode: row.mode,
          isFeeding: toBoolean(row.is_feeding),
          doorOpen: toBoolean(row.door_open),
          wifiConnected: toBoolean(row.wifi_connected),
          serverConnected: toBoolean(row.server_connected),
          timeSynced: toBoolean(row.time_synced),
          scheduleEnabled: toBoolean(row.schedule_enabled),
          scheduleCount: Number(row.schedule_count || 0),
          activeConfigId: row.latest_active_config_id,
          activeConfigVersion: Number(row.latest_active_config_version || 0),
          lastTelemetryAt: toIso(row.last_telemetry_at),
          updatedAt: toIso(row.latest_status_updated_at)
        }
      : null,
    mqttCredential: row.mqtt_credential_id
      ? {
          id: Number(row.mqtt_credential_id),
          username: row.mqtt_username,
          passwordMasked: maskSecret(row.mqtt_password),
          isActive: toBoolean(row.mqtt_credential_active),
          server: {
            id: Number(row.mqtt_server_id),
            name: row.mqtt_server_name,
            host: row.mqtt_host,
            mqttPort: Number(row.mqtt_port),
            tlsPort: Number(row.tls_port),
            useTls: toBoolean(row.mqtt_use_tls)
          }
        }
      : null
  };

  if (includePairingCode) {
    device.pairingCode = row.claim_code;
  }

  if (includeQrPayload) {
    device.qrPayload = buildQrPayload(row);
  }

  return device;
}

function baseDeviceSelect() {
  return `
    SELECT
      d.id,
      d.device_id,
      d.machine_code,
      d.display_name,
      d.claim_code,
      d.claim_code_used_at,
      d.claim_code_rotated_at,
      d.owner_user_id,
      d.firmware_version,
      d.status,
      d.active_config_id,
      d.active_config_version,
      d.last_seen_at,
      d.last_online_at,
      d.last_offline_at,
      d.created_at,
      d.updated_at,
      u.full_name AS owner_full_name,
      u.email AS owner_email,
      ls.device_id AS latest_status_device_id,
      ls.online,
      ls.mode,
      ls.is_feeding,
      ls.door_open,
      ls.wifi_connected,
      ls.server_connected,
      ls.time_synced,
      ls.schedule_enabled,
      ls.schedule_count,
      ls.active_config_id AS latest_active_config_id,
      ls.active_config_version AS latest_active_config_version,
      ls.last_telemetry_at,
      ls.updated_at AS latest_status_updated_at,
      mc.id AS mqtt_credential_id,
      mc.mqtt_username,
      mc.mqtt_password,
      mc.is_active AS mqtt_credential_active,
      ms.id AS mqtt_server_id,
      ms.name AS mqtt_server_name,
      ms.host AS mqtt_host,
      ms.mqtt_port,
      ms.tls_port,
      ms.use_tls AS mqtt_use_tls
    FROM devices d
    LEFT JOIN users u ON u.id = d.owner_user_id
    LEFT JOIN device_latest_status ls ON ls.device_id = d.id
    LEFT JOIN device_mqtt_credentials mc ON mc.device_id = d.id AND mc.is_active = TRUE
    LEFT JOIN mqtt_servers ms ON ms.id = mc.mqtt_server_id
  `;
}

export async function findAdminDeviceByDeviceId(deviceId, connection = null) {
  const executor = connection || getPool();
  const [rows] = await executor.execute(
    `${baseDeviceSelect()} WHERE d.device_id = ? LIMIT 1`,
    [deviceId]
  );
  return rows[0] || null;
}

async function getActiveMqttServer({ mqttServerId = null, connection }) {
  if (mqttServerId) {
    const [rows] = await connection.execute(
      `SELECT id, name, host, mqtt_port, tls_port, use_tls
       FROM mqtt_servers
       WHERE id = ? AND is_active = TRUE
       LIMIT 1`,
      [mqttServerId]
    );
    if (!rows[0]) {
      throw badRequestError('MQTT server was not found or is inactive.', 'MQTT_SERVER_NOT_FOUND');
    }
    return rows[0];
  }

  const [rows] = await connection.execute(
    `SELECT id, name, host, mqtt_port, tls_port, use_tls
     FROM mqtt_servers
     WHERE is_active = TRUE
     ORDER BY id ASC
     LIMIT 1`
  );

  if (!rows[0]) {
    throw badRequestError('No active MQTT server found. Seed or create one first.', 'NO_ACTIVE_MQTT_SERVER');
  }

  return rows[0];
}

async function assertUniqueDeviceFields({ deviceId, machineCode, mqttUsername, connection }) {
  const [deviceRows] = await connection.execute(
    `SELECT device_id, machine_code FROM devices WHERE device_id = ? OR machine_code = ? LIMIT 1`,
    [deviceId, machineCode]
  );

  if (deviceRows.length > 0) {
    const existing = deviceRows[0];
    if (existing.device_id === deviceId) {
      throw conflictError('Device ID already exists.', 'DEVICE_ID_ALREADY_EXISTS');
    }
    throw conflictError('Machine code already exists.', 'MACHINE_CODE_ALREADY_EXISTS');
  }

  const [mqttRows] = await connection.execute(
    `SELECT id FROM device_mqtt_credentials WHERE mqtt_username = ? LIMIT 1`,
    [mqttUsername]
  );

  if (mqttRows.length > 0) {
    throw conflictError('MQTT username already exists.', 'MQTT_USERNAME_ALREADY_EXISTS');
  }
}

export async function createAdminDevice(input, context) {
  const connection = await getPool().getConnection();
  const deviceId = normalizeDeviceId(input.deviceId || createDeviceId());
  const machineCode = normalizeMachineCode(input.machineCode || createMachineCode());
  const pairingCode = normalizePairingCode(input.pairingCode || createPairingCode());
  const deviceSecret = input.deviceSecret || createDeviceSecret();
  const firmwareVersion = emptyToNull(input.firmwareVersion);
  const status = normalizeStatus(input.status);
  const mqttUsername = normalizeDeviceId(input.mqttUsername || deviceId);
  const mqttPassword = input.mqttPassword || createMqttPassword();

  try {
    await connection.beginTransaction();
    await assertUniqueDeviceFields({ deviceId, machineCode, mqttUsername, connection });
    const mqttServer = await getActiveMqttServer({ mqttServerId: input.mqttServerId, connection });

    const [deviceResult] = await connection.execute(
      `INSERT INTO devices (
        device_id,
        machine_code,
        claim_code,
        claim_code_used_at,
        claim_code_rotated_at,
        owner_user_id,
        device_secret,
        firmware_version,
        status,
        active_config_id,
        active_config_version,
        last_seen_at,
        last_online_at,
        last_offline_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, NULL, NULL, NULL, ?, ?, ?, NULL, 0, NULL, NULL, NULL, NOW(), NOW())`,
      [deviceId, machineCode, pairingCode, deviceSecret, firmwareVersion, status]
    );

    const devicePk = deviceResult.insertId;

    await connection.execute(
      `INSERT INTO device_mqtt_credentials (
        device_id,
        mqtt_server_id,
        mqtt_username,
        mqtt_password,
        is_active,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, TRUE, NOW(), NOW())`,
      [devicePk, mqttServer.id, mqttUsername, mqttPassword]
    );

    await connection.execute(
      `INSERT INTO device_latest_status (
        device_id,
        online,
        mode,
        is_feeding,
        door_open,
        wifi_connected,
        server_connected,
        time_synced,
        schedule_enabled,
        schedule_count,
        active_config_id,
        active_config_version,
        last_seen_at,
        last_telemetry_at,
        updated_at
      ) VALUES (?, FALSE, 'unknown', FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, 0, NULL, 0, NULL, NULL, NOW())`,
      [devicePk]
    );

    await writeAuditLog({
      actorUserId: context.actorUserId,
      action: 'admin.device.create',
      targetType: 'device',
      targetId: deviceId,
      payload: {
        deviceId,
        machineCode,
        mqttServerId: Number(mqttServer.id),
        mqttUsername,
        status
      },
      clientIp: context.clientIp,
      userAgent: context.userAgent,
      connection
    });

    await connection.commit();

    // Sync MQTT credentials to broker (non-blocking, don't fail device creation if sync fails)
    syncPassword(mqttUsername, mqttPassword).catch((syncError) => {
      console.error('MQTT sync failed after device creation:', syncError);
    });

    const deviceRow = await findAdminDeviceByDeviceId(deviceId);
    return toAdminDevice(deviceRow, { includeQrPayload: true, includePairingCode: true });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listAdminDevices(query = {}) {
  const pool = getPool();
  const { page, pageSize, offset } = paginationFromQuery(query);

  const where = [];
  const values = [];

  if (query.status) {
    where.push('d.status = ?');
    values.push(query.status);
  }

  if (query.ownerUserId !== undefined && query.ownerUserId !== null) {
    where.push('d.owner_user_id = ?');
    values.push(query.ownerUserId);
  }

  if (query.q) {
    where.push('(d.device_id LIKE ? OR d.machine_code LIKE ? OR u.email LIKE ?)');
    const keyword = `%${query.q}%`;
    values.push(keyword, keyword, keyword);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM devices d
     LEFT JOIN users u ON u.id = d.owner_user_id
     ${whereSql}`,
    values
  );

  const [rows] = await pool.execute(
    `${baseDeviceSelect()}
     ${whereSql}
     ORDER BY d.created_at DESC, d.id DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    values
  );

  const total = Number(countRows[0]?.total || 0);
  return {
    devices: rows.map((row) => toAdminDevice(row)),
    meta: buildPaginationMeta({ page, pageSize, totalItems: total })
  };
}

export async function getAdminDevice(deviceId) {
  const row = await findAdminDeviceByDeviceId(deviceId);
  if (!row) {
    throw notFoundError('Device was not found.', 'DEVICE_NOT_FOUND');
  }

  return toAdminDevice(row);
}

export async function getAdminDeviceQr(deviceId) {
  const row = await findAdminDeviceByDeviceId(deviceId);
  if (!row) {
    throw notFoundError('Device was not found.', 'DEVICE_NOT_FOUND');
  }

  return {
    deviceId: row.device_id,
    machineCode: row.machine_code,
    pairingCodeMasked: maskPairingCode(row.claim_code),
    qrPayload: buildQrPayload(row)
  };
}

export async function getPairingCodeStatus(deviceId) {
  const row = await findAdminDeviceByDeviceId(deviceId);
  if (!row) {
    throw notFoundError('Device was not found.', 'DEVICE_NOT_FOUND');
  }

  return {
    deviceId: row.device_id,
    machineCode: row.machine_code,
    pairingCodeMasked: maskPairingCode(row.claim_code),
    usedAt: toIso(row.claim_code_used_at),
    rotatedAt: toIso(row.claim_code_rotated_at),
    canBeClaimed: !row.owner_user_id && !row.claim_code_used_at && row.status !== 'disabled' && row.status !== 'revoked'
  };
}

export async function rotatePairingCode(deviceId, context) {
  const connection = await getPool().getConnection();
  const newPairingCode = createPairingCode();

  try {
    await connection.beginTransaction();
    const row = await findAdminDeviceByDeviceId(deviceId, connection);
    if (!row) {
      throw notFoundError('Device was not found.', 'DEVICE_NOT_FOUND');
    }

    await connection.execute(
      `UPDATE devices
       SET claim_code = ?, claim_code_used_at = NULL, claim_code_rotated_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [newPairingCode, row.id]
    );

    await writeAuditLog({
      actorUserId: context.actorUserId,
      action: 'admin.device.rotate_pairing_code',
      targetType: 'device',
      targetId: row.device_id,
      payload: {
        deviceId: row.device_id,
        machineCode: row.machine_code,
        previousPairingCodeMasked: maskPairingCode(row.claim_code)
      },
      clientIp: context.clientIp,
      userAgent: context.userAgent,
      connection
    });

    await connection.commit();

    const updatedRow = await findAdminDeviceByDeviceId(deviceId);
    return {
      ok: true,
      deviceId: updatedRow.device_id,
      machineCode: updatedRow.machine_code,
      pairingCode: updatedRow.claim_code,
      qrPayload: buildQrPayload(updatedRow)
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateAdminDevice(deviceId, input, context = {}) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const row = await findAdminDeviceByDeviceId(deviceId, connection);
    if (!row) throw notFoundError('Device was not found.', 'DEVICE_NOT_FOUND');

    if (input.machineCode && normalizeMachineCode(input.machineCode) !== row.machine_code) {
      const machineCode = normalizeMachineCode(input.machineCode);
      const [dupes] = await connection.execute('SELECT id FROM devices WHERE machine_code = ? AND id <> ? LIMIT 1', [machineCode, row.id]);
      if (dupes.length) throw conflictError('Machine code already exists.', 'MACHINE_CODE_ALREADY_EXISTS');
      input.machineCode = machineCode;
    }

    const displayName = Object.hasOwn(input, 'displayName') ? emptyToNull(input.displayName) : row.display_name;
    const machineCode = input.machineCode || row.machine_code;
    const firmwareVersion = Object.hasOwn(input, 'firmwareVersion') ? emptyToNull(input.firmwareVersion) : row.firmware_version;
    const status = input.status ? normalizeStatus(input.status) : row.status;

    await connection.execute(
      `UPDATE devices
       SET display_name = ?, machine_code = ?, firmware_version = ?, status = ?, updated_at = NOW()
       WHERE id = ?`,
      [displayName, machineCode, firmwareVersion, status, row.id]
    );

    await writeAuditLog({
      actorUserId: context.actorUserId,
      action: 'admin.device.update',
      targetType: 'device',
      targetId: row.device_id,
      payload: { updatedFields: Object.keys(input) },
      clientIp: context.clientIp,
      userAgent: context.userAgent,
      connection
    });

    await connection.commit();
    return toAdminDevice(await findAdminDeviceByDeviceId(deviceId));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function setAdminDeviceStatus(deviceId, status, context = {}, auditAction = null) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const row = await findAdminDeviceByDeviceId(deviceId, connection);
    if (!row) throw notFoundError('Device was not found.', 'DEVICE_NOT_FOUND');

    await connection.execute('UPDATE devices SET status = ?, updated_at = NOW() WHERE id = ?', [status, row.id]);
    if (status === 'disabled' || status === 'revoked') {
      await connection.execute(
        `UPDATE device_latest_status SET online = FALSE, is_feeding = FALSE, door_open = FALSE, updated_at = NOW() WHERE device_id = ?`,
        [row.id]
      );
    }

    await writeAuditLog({
      actorUserId: context.actorUserId,
      action: auditAction || `admin.device.${status}`,
      targetType: 'device',
      targetId: row.device_id,
      payload: { previousStatus: row.status, newStatus: status },
      clientIp: context.clientIp,
      userAgent: context.userAgent,
      connection
    });

    await connection.commit();
    return toAdminDevice(await findAdminDeviceByDeviceId(deviceId));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export function disableAdminDevice(deviceId, context) {
  return setAdminDeviceStatus(deviceId, 'disabled', context, 'admin.device.disable');
}

export async function enableAdminDevice(deviceId, context = {}) {
  const row = await findAdminDeviceByDeviceId(deviceId);
  if (!row) throw notFoundError('Device was not found.', 'DEVICE_NOT_FOUND');
  const nextStatus = row.owner_user_id ? 'linked' : 'not_configured';
  return setAdminDeviceStatus(deviceId, nextStatus, context, 'admin.device.enable');
}

export function revokeAdminDevice(deviceId, context) {
  return setAdminDeviceStatus(deviceId, 'revoked', context, 'admin.device.revoke');
}

export async function unlinkAdminDevice(deviceId, context = {}) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const row = await findAdminDeviceByDeviceId(deviceId, connection);
    if (!row) throw notFoundError('Device was not found.', 'DEVICE_NOT_FOUND');

    await connection.execute(
      `UPDATE devices SET owner_user_id = NULL, status = 'unlinked', updated_at = NOW() WHERE id = ?`,
      [row.id]
    );
    await connection.execute(
      `INSERT INTO device_link_histories (device_id, user_id, machine_code, pairing_code_used, action, client_ip, user_agent, created_at)
       VALUES (?, ?, ?, NULL, 'unlinked_by_admin', ?, ?, NOW())`,
      [row.id, row.owner_user_id || null, row.machine_code, context.clientIp || null, context.userAgent || null]
    );
    await writeAuditLog({
      actorUserId: context.actorUserId,
      action: 'admin.device.unlink',
      targetType: 'device',
      targetId: row.device_id,
      payload: { previousOwnerUserId: row.owner_user_id || null },
      clientIp: context.clientIp,
      userAgent: context.userAgent,
      connection
    });

    await connection.commit();
    return toAdminDevice(await findAdminDeviceByDeviceId(deviceId));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function transferAdminDeviceOwner(deviceId, input, context = {}) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const row = await findAdminDeviceByDeviceId(deviceId, connection);
    if (!row) throw notFoundError('Device was not found.', 'DEVICE_NOT_FOUND');

    const [users] = await connection.execute('SELECT id, email FROM users WHERE id = ? AND is_disabled = FALSE LIMIT 1', [input.ownerUserId]);
    if (!users[0]) throw notFoundError('Target owner user was not found or is disabled.', 'USER_NOT_FOUND');

    await connection.execute(
      `UPDATE devices SET owner_user_id = ?, status = 'linked', updated_at = NOW() WHERE id = ?`,
      [input.ownerUserId, row.id]
    );
    await connection.execute(
      `INSERT INTO device_link_histories (device_id, user_id, machine_code, pairing_code_used, action, client_ip, user_agent, created_at)
       VALUES (?, ?, ?, NULL, 'transferred', ?, ?, NOW())`,
      [row.id, input.ownerUserId, row.machine_code, context.clientIp || null, context.userAgent || null]
    );
    await writeAuditLog({
      actorUserId: context.actorUserId,
      action: 'admin.device.transfer_owner',
      targetType: 'device',
      targetId: row.device_id,
      payload: { previousOwnerUserId: row.owner_user_id || null, newOwnerUserId: Number(input.ownerUserId) },
      clientIp: context.clientIp,
      userAgent: context.userAgent,
      connection
    });

    await connection.commit();
    return toAdminDevice(await findAdminDeviceByDeviceId(deviceId));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listAdminDeviceLinkAttempts(deviceId, query = {}) {
  const row = await findAdminDeviceByDeviceId(deviceId);
  if (!row) throw notFoundError('Device was not found.', 'DEVICE_NOT_FOUND');
  const { page, pageSize, offset } = paginationFromQuery(query);

  const [countRows] = await getPool().execute(
    `SELECT COUNT(*) AS total FROM device_link_histories WHERE device_id = ? OR machine_code = ?`,
    [row.id, row.machine_code]
  );
  const [rows] = await getPool().execute(
    `SELECT h.*, u.email AS user_email, u.full_name AS user_full_name
     FROM device_link_histories h
     LEFT JOIN users u ON u.id = h.user_id
     WHERE h.device_id = ? OR h.machine_code = ?
     ORDER BY h.created_at DESC, h.id DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    [row.id, row.machine_code]
  );

  return {
    attempts: rows.map((item) => ({
      id: Number(item.id),
      deviceId: row.device_id,
      machineCode: item.machine_code,
      action: item.action,
      pairingCodeMasked: maskPairingCode(item.pairing_code_used),
      user: item.user_id ? { id: Number(item.user_id), email: item.user_email, fullName: item.user_full_name || null } : null,
      clientIp: item.client_ip || null,
      userAgent: item.user_agent || null,
      createdAt: toIso(item.created_at)
    })),
    meta: buildPaginationMeta({ page, pageSize, totalItems: Number(countRows[0]?.total || 0) })
  };
}

export async function deleteAdminDevice(deviceId, context = {}) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();

    const device = await findAdminDeviceByDeviceId(normalizeDeviceId(deviceId), connection);
    if (!device) throw notFoundError('Device was not found.', 'DEVICE_NOT_FOUND');

    // Get all MQTT credentials for this device before deletion
    const [credentials] = await connection.execute(
      'SELECT mqtt_username FROM device_mqtt_credentials WHERE device_id = ?',
      [device.id]
    );

    // Delete device (cascade should handle related records based on FK constraints)
    await connection.execute('DELETE FROM devices WHERE id = ?', [device.id]);

    await writeAuditLog({
      actorUserId: context.actorUserId,
      action: 'admin.device.delete',
      targetType: 'device',
      targetId: deviceId,
      payload: { deletedDeviceId: device.device_id, mqttCredentialsCount: credentials.length },
      clientIp: context.clientIp,
      userAgent: context.userAgent,
      connection
    });

    await connection.commit();

    // Delete MQTT credentials from broker (non-blocking)
    for (const cred of credentials) {
      if (cred.mqtt_username) {
        deleteCredential(cred.mqtt_username).catch((syncError) => {
          console.error('MQTT credential delete failed for', cred.mqtt_username, ':', syncError);
        });
      }
    }

    return { deleted: true, deviceId, credentialsDeleted: credentials.length };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
