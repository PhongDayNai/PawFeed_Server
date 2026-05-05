import { getPool } from '../config/db.js';
import { conflictError, notFoundError } from '../utils/errors.js';
import { createDeviceSecret, createMqttPassword, maskSecret } from '../utils/crypto.js';
import { normalizeDeviceId } from '../utils/normalize.js';
import { buildPaginationMeta, paginationFromQuery } from '../utils/pagination.js';
import { findAdminDeviceByDeviceId } from './adminDevice.service.js';
import { writeAuditLog } from './audit.service.js';

function toIso(value) { return value ? new Date(value).toISOString() : null; }
function toBoolean(value) { return Boolean(Number(value)); }

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
  if (query.search) { conditions.push('(name LIKE ? OR host LIKE ?)'); const keyword = `%${query.search}%`; values.push(keyword, keyword); }
  if (query.isActive !== undefined) { conditions.push('is_active = ?'); values.push(query.isActive); }
  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [countRows] = await getPool().execute(`SELECT COUNT(*) AS total FROM mqtt_servers ${whereSql}`, values);
  const [rows] = await getPool().execute(
    `SELECT * FROM mqtt_servers ${whereSql} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`,
    values
  );
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
      [input.name ?? row.name, input.host ?? row.host, input.mqttPort ?? row.mqtt_port, input.tlsPort ?? row.tls_port, Object.hasOwn(input, 'websocketPort') ? input.websocketPort : row.websocket_port, input.useTls ?? toBoolean(row.use_tls), input.isActive ?? toBoolean(row.is_active), id]
    );
    await writeAuditLog({ actorUserId: context.actorUserId, action: 'admin.mqtt_server.update', targetType: 'mqtt_server', targetId: String(id), payload: { updatedFields: Object.keys(input) }, clientIp: context.clientIp, userAgent: context.userAgent, connection });
    await connection.commit();
    return getMqttServer(id);
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}

export async function testMqttServer(id) {
  const server = await getMqttServer(id);
  return {
    ok: true,
    server,
    testMode: 'metadata_only',
    message: 'MQTT server metadata exists. A real network connect test should be run in Phase 16/deployment with broker credentials available.'
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
     ORDER BY c.id DESC
     LIMIT 1`,
    [normalized]
  );
  return rows[0] || null;
}

export async function getDeviceMqttCredential(deviceId) {
  const credential = await getCredentialByDevice(deviceId);
  if (!credential) throw notFoundError('MQTT credential was not found.', 'MQTT_CREDENTIAL_NOT_FOUND');
  return toMqttCredential(credential);
}

export async function rotateDeviceMqttCredential(deviceId, input = {}, context = {}) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const device = await findAdminDeviceByDeviceId(normalizeDeviceId(deviceId), connection);
    if (!device) throw notFoundError('Device was not found.', 'DEVICE_NOT_FOUND');
    const mqttServerId = input.mqttServerId || device.mqtt_server_id;
    const server = await getMqttServerRow(mqttServerId, connection);
    if (!server || !toBoolean(server.is_active)) throw notFoundError('MQTT server was not found or inactive.', 'MQTT_SERVER_NOT_FOUND');
    const mqttUsername = input.mqttUsername || `${device.device_id}_${Date.now().toString(36)}`;
    const mqttPassword = input.mqttPassword || createMqttPassword();
    const [dupes] = await connection.execute('SELECT id FROM device_mqtt_credentials WHERE mqtt_username = ? LIMIT 1', [mqttUsername]);
    if (dupes.length) throw conflictError('MQTT username already exists.', 'MQTT_USERNAME_ALREADY_EXISTS');

    await connection.execute('UPDATE device_mqtt_credentials SET is_active = FALSE, updated_at = NOW() WHERE device_id = ?', [device.id]);
    const [result] = await connection.execute(
      `INSERT INTO device_mqtt_credentials (device_id, mqtt_server_id, mqtt_username, mqtt_password, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, TRUE, NOW(), NOW())`,
      [device.id, mqttServerId, mqttUsername, mqttPassword]
    );
    await writeAuditLog({ actorUserId: context.actorUserId, action: 'admin.device.rotate_mqtt_credential', targetType: 'device', targetId: device.device_id, payload: { mqttServerId: Number(mqttServerId), mqttUsername }, clientIp: context.clientIp, userAgent: context.userAgent, connection });
    await connection.commit();

    const [rows] = await getPool().execute(
      `SELECT c.*, d.device_id, d.machine_code, ms.name AS mqtt_server_name, ms.host, ms.mqtt_port, ms.tls_port, ms.use_tls
       FROM device_mqtt_credentials c
       INNER JOIN devices d ON d.id = c.device_id
       INNER JOIN mqtt_servers ms ON ms.id = c.mqtt_server_id
       WHERE c.id = ? LIMIT 1`,
      [result.insertId]
    );
    return { credential: toMqttCredential(rows[0], { includePasswordOnce: true }), note: 'The new MQTT password is returned once for admin provisioning only.' };
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}

export async function rotateDeviceSecret(deviceId, input = {}, context = {}) {
  const connection = await getPool().getConnection();
  const newSecret = input.deviceSecret || createDeviceSecret();
  try {
    await connection.beginTransaction();
    const device = await findAdminDeviceByDeviceId(normalizeDeviceId(deviceId), connection);
    if (!device) throw notFoundError('Device was not found.', 'DEVICE_NOT_FOUND');
    await connection.execute('UPDATE devices SET device_secret = ?, updated_at = NOW() WHERE id = ?', [newSecret, device.id]);
    await writeAuditLog({ actorUserId: context.actorUserId, action: 'admin.device.rotate_device_secret', targetType: 'device', targetId: device.device_id, payload: { rotated: true }, clientIp: context.clientIp, userAgent: context.userAgent, connection });
    await connection.commit();
    return { deviceId: device.device_id, machineCode: device.machine_code, deviceSecret: newSecret, note: 'The new deviceSecret is returned once for firmware/provisioning sync.' };
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}

export const __adminMqttInternals = { toMqttServer, toMqttCredential };
