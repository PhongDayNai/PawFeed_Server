import { getPool } from '../config/db.js';
import { badRequestError, conflictError, notFoundError } from '../utils/errors.js';
import { createDeviceSecret, createMqttPassword, maskSecret } from '../utils/crypto.js';
import { normalizeDeviceId } from '../utils/normalize.js';
import { buildPaginationMeta, paginationFromQuery } from '../utils/pagination.js';
import { findAdminDeviceByDeviceId } from './adminDevice.service.js';
import { writeAuditLog } from './audit.service.js';
import { buildMqttAdminTestConfig, testMqttConnectivity } from './mqttConnectionTest.service.js';

function toIso(value) { return value ? new Date(value).toISOString() : null; }
function toBoolean(value) { return Boolean(Number(value)); }
function hasOwn(object, key) { return Object.prototype.hasOwnProperty.call(object, key); }

function toMqttServer(row) {
  return {
    id: Number(row.id),
    name: row.name,
    host: row.host,
    mqttPort: Number(row.mqtt_port),
    tlsPort: Number(row.tls_port),
    websocketPort: row.websocket_port === null ? null : Number(row.websocket_port),
    useTls: toBoolean(row.use_tls),
    isActive: toBoolean(row.is_active),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

function toMqttCredential(row, { includePasswordOnce = false } = {}) {
  return {
    id: Number(row.id),
    deviceId: row.device_id,
    machineCode: row.machine_code,
    mqttUsername: row.mqtt_username,
    hasMqttPassword: Boolean(row.mqtt_password),
    mqttPasswordMasked: maskSecret(row.mqtt_password),
    ...(includePasswordOnce ? { mqttPassword: row.mqtt_password } : {}),
    isActive: toBoolean(row.is_active),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    server: {
      id: Number(row.mqtt_server_id),
      name: row.mqtt_server_name,
      host: row.host,
      mqttPort: Number(row.mqtt_port),
      tlsPort: Number(row.tls_port),
      useTls: toBoolean(row.use_tls)
    }
  };
}

async function getMqttServerRow(id, executor = getPool()) {
  const [rows] = await executor.execute('SELECT * FROM mqtt_servers WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

export async function listMqttServers(query = {}) {
  const { page, limit, offset } = paginationFromQuery(query);
  const conditions = [];
  const values = [];
  if (query.search) {
    conditions.push('(name LIKE ? OR host LIKE ?)');
    const keyword = `%${query.search}%`;
    values.push(keyword, keyword);
  }
  if (query.isActive !== undefined) {
    conditions.push('is_active = ?');
    values.push(query.isActive);
  }
  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [countRows] = await getPool().execute(`SELECT COUNT(*) AS total FROM mqtt_servers ${whereSql}`, values);
  const [rows] = await getPool().execute(`SELECT * FROM mqtt_servers ${whereSql} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`, values);
  return { servers: rows.map(toMqttServer), meta: buildPaginationMeta({ page, limit, total: Number(countRows[0]?.total || 0) }) };
}

export async function createMqttServer(input, context = {}) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const [dupes] = await connection.execute('SELECT id FROM mqtt_servers WHERE name = ? LIMIT 1', [input.name]);
    if (dupes.length) throw conflictError('MQTT server name already exists.', 'MQTT_SERVER_NAME_EXISTS');
    const [result] = await connection.execute(
      `INSERT INTO mqtt_servers (name, host, mqtt_port, tls_port, websocket_port, use_tls, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [input.name, input.host, input.mqttPort, input.tlsPort, input.websocketPort ?? null, input.useTls, input.isActive]
    );
    await writeAuditLog({ actorUserId: context.actorUserId, action: 'admin.mqtt_server.create', targetType: 'mqtt_server', targetId: String(result.insertId), payload: { name: input.name, host: input.host }, clientIp: context.clientIp, userAgent: context.userAgent, connection });
    await connection.commit();
    return toMqttServer(await getMqttServerRow(result.insertId));
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}

export async function getMqttServer(id) {
  const row = await getMqttServerRow(id);
  if (!row) throw notFoundError('MQTT server was not found.', 'MQTT_SERVER_NOT_FOUND');
  return toMqttServer(row);
}

export async function updateMqttServer(id, input, context = {}) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const row = await getMqttServerRow(id, connection);
    if (!row) throw notFoundError('MQTT server was not found.', 'MQTT_SERVER_NOT_FOUND');
    if (input.name && input.name !== row.name) {
      const [dupes] = await connection.execute('SELECT id FROM mqtt_servers WHERE name = ? AND id <> ? LIMIT 1', [input.name, id]);
      if (dupes.length) throw conflictError('MQTT server name already exists.', 'MQTT_SERVER_NAME_EXISTS');
    }
    await connection.execute(
      `UPDATE mqtt_servers SET name = ?, host = ?, mqtt_port = ?, tls_port = ?, websocket_port = ?, use_tls = ?, is_active = ?, updated_at = NOW() WHERE id = ?`,
      [input.name ?? row.name, input.host ?? row.host, input.mqttPort ?? row.mqtt_port, input.tlsPort ?? row.tls_port, hasOwn(input, 'websocketPort') ? input.websocketPort : row.websocket_port, input.useTls ?? toBoolean(row.use_tls), input.isActive ?? toBoolean(row.is_active), id]
    );
    await writeAuditLog({ actorUserId: context.actorUserId, action: 'admin.mqtt_server.update', targetType: 'mqtt_server', targetId: String(id), payload: { updatedFields: Object.keys(input) }, clientIp: context.clientIp, userAgent: context.userAgent, connection });
    await connection.commit();
    return getMqttServer(id);
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}

export async function testMqttServer(id, input = {}, context = {}) {
  const row = await getMqttServerRow(id);
  if (!row) throw notFoundError('MQTT server was not found.', 'MQTT_SERVER_NOT_FOUND');

  const config = buildMqttAdminTestConfig(row, input);
  const result = await testMqttConnectivity(config);

  await writeAuditLog({
    actorUserId: context.actorUserId,
    action: 'admin.mqtt_server.test',
    targetType: 'mqtt_server',
    targetId: String(id),
    payload: { host: row.host, port: config.port, useTls: config.useTls, usedUsername: result.usedUsername },
    clientIp: context.clientIp,
    userAgent: context.userAgent
  });

  return {
    ...result,
    server: toMqttServer(row)
  };
}

async function getCredentialByDevice(deviceId, executor = getPool()) {
  const normalized = normalizeDeviceId(deviceId);
  const [rows] = await executor.execute(
    `SELECT c.*, d.device_id, d.machine_code, ms.name AS mqtt_server_name, ms.host, ms.mqtt_port, ms.tls_port, ms.use_tls
     FROM device_mqtt_credentials c
     INNER JOIN devices d ON d.id = c.device_id
     INNER JOIN mqtt_servers ms ON ms.id = c.mqtt_server_id
     WHERE d.device_id = ? AND c.is_active = TRUE
     ORDER BY c.updated_at DESC, c.created_at DESC, c.id DESC
     LIMIT 1`,
    [normalized]
  );
  return rows[0] || null;
}

async function listCredentialsByDevice(deviceId, executor = getPool()) {
  const normalized = normalizeDeviceId(deviceId);
  const [rows] = await executor.execute(
    `SELECT c.*, d.device_id, d.machine_code, ms.name AS mqtt_server_name, ms.host, ms.mqtt_port, ms.tls_port, ms.use_tls
     FROM device_mqtt_credentials c
     INNER JOIN devices d ON d.id = c.device_id
     INNER JOIN mqtt_servers ms ON ms.id = c.mqtt_server_id
     WHERE d.device_id = ?
     ORDER BY c.is_active DESC, c.updated_at DESC, c.created_at DESC, c.id DESC`,
    [normalized]
  );
  return rows;
}

export async function getDeviceMqttCredential(deviceId) {
  const credential = await getCredentialByDevice(deviceId);
  if (!credential) throw notFoundError('MQTT credential was not found.', 'MQTT_CREDENTIAL_NOT_FOUND');
  return toMqttCredential(credential);
}

export async function listDeviceMqttCredentials(deviceId) {
  const rows = await listCredentialsByDevice(deviceId);
  if (!rows.length) throw notFoundError('MQTT credential was not found.', 'MQTT_CREDENTIAL_NOT_FOUND');
  return rows.map((row) => toMqttCredential(row));
}

export async function rotateDeviceMqttCredential(deviceId, input = {}, context = {}) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const device = await findAdminDeviceByDeviceId(normalizeDeviceId(deviceId), connection);
    if (!device) throw notFoundError('Device was not found.', 'DEVICE_NOT_FOUND');

    const current = await getCredentialByDevice(device.device_id, connection);
    const rotationMode = input.rotationMode || 'new_credential';
    const mqttServerId = input.mqttServerId || current?.mqtt_server_id || device.mqtt_server_id;
    const server = await getMqttServerRow(mqttServerId, connection);
    if (!server || !toBoolean(server.is_active)) throw notFoundError('MQTT server was not found or inactive.', 'MQTT_SERVER_NOT_FOUND');

    const mqttPassword = input.mqttPassword || createMqttPassword();

    if (rotationMode === 'password_only') {
      if (!current) throw notFoundError('MQTT credential was not found.', 'MQTT_CREDENTIAL_NOT_FOUND');
      await connection.execute(
        `UPDATE device_mqtt_credentials SET mqtt_server_id = ?, mqtt_password = ?, is_active = TRUE, updated_at = NOW() WHERE id = ?`,
        [mqttServerId, mqttPassword, current.id]
      );
      await writeAuditLog({ actorUserId: context.actorUserId, action: 'admin.device.rotate_mqtt_password', targetType: 'device', targetId: device.device_id, payload: { mqttServerId: Number(mqttServerId), mqttUsername: current.mqtt_username }, clientIp: context.clientIp, userAgent: context.userAgent, connection });
      await connection.commit();

      const refreshed = await getCredentialByDevice(device.device_id);
      return {
        credential: toMqttCredential(refreshed, { includePasswordOnce: true }),
        rotationMode,
        warning: 'Password-only rotation replaces the old password in DB. Generate/apply a new config file immediately so the Machine receives the new password.'
      };
    }

    const mqttUsername = input.mqttUsername || `${device.device_id}_${Date.now().toString(36)}`;
    const [dupes] = await connection.execute('SELECT id FROM device_mqtt_credentials WHERE mqtt_username = ? LIMIT 1', [mqttUsername]);
    if (dupes.length) throw conflictError('MQTT username already exists.', 'MQTT_USERNAME_ALREADY_EXISTS');

    const deactivateOld = input.deactivateOld === true;
    if (deactivateOld) {
      await connection.execute('UPDATE device_mqtt_credentials SET is_active = FALSE, updated_at = NOW() WHERE device_id = ?', [device.id]);
    }

    const [result] = await connection.execute(
      `INSERT INTO device_mqtt_credentials (device_id, mqtt_server_id, mqtt_username, mqtt_password, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, TRUE, NOW(), NOW())`,
      [device.id, mqttServerId, mqttUsername, mqttPassword]
    );
    await writeAuditLog({ actorUserId: context.actorUserId, action: 'admin.device.rotate_mqtt_credential', targetType: 'device', targetId: device.device_id, payload: { mqttServerId: Number(mqttServerId), mqttUsername, deactivateOld }, clientIp: context.clientIp, userAgent: context.userAgent, connection });
    await connection.commit();

    const [rows] = await getPool().execute(
      `SELECT c.*, d.device_id, d.machine_code, ms.name AS mqtt_server_name, ms.host, ms.mqtt_port, ms.tls_port, ms.use_tls
       FROM device_mqtt_credentials c
       INNER JOIN devices d ON d.id = c.device_id
       INNER JOIN mqtt_servers ms ON ms.id = c.mqtt_server_id
       WHERE c.id = ? LIMIT 1`,
      [result.insertId]
    );
    return {
      credential: toMqttCredential(rows[0], { includePasswordOnce: true }),
      rotationMode,
      oldCredentialDeactivated: deactivateOld,
      note: deactivateOld
        ? 'Old MQTT credentials were deactivated. Generate/apply a new config file before expecting the Machine to connect with the new credential.'
        : 'Old MQTT credentials were kept active in DB so the Machine can keep running until a new config file is applied. The new password is returned once for admin provisioning only.'
    };
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}

export async function rotateDeviceSecret(deviceId, input = {}, context = {}) {
  if (input.confirmFirmwareSync !== true) {
    throw badRequestError(
      'Device secret rotation is dangerous and requires confirmFirmwareSync=true. If the Machine firmware still has the old secret, it will reject every new config file.',
      'DEVICE_SECRET_ROTATION_NOT_CONFIRMED'
    );
  }

  const connection = await getPool().getConnection();
  const newSecret = input.deviceSecret || createDeviceSecret();
  try {
    await connection.beginTransaction();
    const device = await findAdminDeviceByDeviceId(normalizeDeviceId(deviceId), connection);
    if (!device) throw notFoundError('Device was not found.', 'DEVICE_NOT_FOUND');
    await connection.execute('UPDATE devices SET device_secret = ?, updated_at = NOW() WHERE id = ?', [newSecret, device.id]);
    await writeAuditLog({ actorUserId: context.actorUserId, action: 'admin.device.rotate_device_secret', targetType: 'device', targetId: device.device_id, payload: { rotated: true, confirmedFirmwareSync: true }, clientIp: context.clientIp, userAgent: context.userAgent, connection });
    await connection.commit();
    return {
      deviceId: device.device_id,
      machineCode: device.machine_code,
      deviceSecret: newSecret,
      warning: 'The new deviceSecret is returned once. Reflash/update the Machine factory secret before generating configs signed with this secret.'
    };
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}

export const __adminMqttInternals = { toMqttServer, toMqttCredential };
