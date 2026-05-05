import crypto from 'crypto';
import { customAlphabet } from 'nanoid';
import { getPool } from '../config/db.js';
import { badRequestError, notFoundError } from '../utils/errors.js';
import { emptyToNull, normalizeDeviceId } from '../utils/normalize.js';
import { writeAuditLog } from './audit.service.js';
import { getProviderSettings, getServerDefaultSettings } from './systemSettings.service.js';

const randomId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8);
const CONFIG_SCHEMA_VERSION = 3;
const blockedStatuses = new Set(['disabled', 'revoked']);

function toBoolean(value) {
  return Boolean(Number(value));
}

function boolText(value) {
  return value ? 'true' : 'false';
}

function toIso(value) {
  return value ? new Date(value).toISOString() : null;
}

function epochSeconds(date = new Date()) {
  return Math.floor(date.getTime() / 1000);
}

function yyyymmddhhmmss(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    '_',
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds())
  ].join('');
}

function createConfigId(deviceId, now = new Date()) {
  return `cfg_${deviceId}_${yyyymmddhhmmss(now)}_${randomId()}`;
}

function normalizeTimezone(value, fallback = 'Asia/Bangkok') {
  return emptyToNull(value) || fallback;
}

function normalizeTimezoneOffset(value, fallback = 25200) {
  if (value === undefined || value === null || value === '') return Number(fallback);
  return Number(value);
}

function parseJsonSetting(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeProvider(provider = {}) {
  return {
    name: provider.name ?? '',
    brand: provider.brand ?? '',
    website: provider.website ?? '',
    contact: provider.contact ?? '',
    note: provider.note ?? ''
  };
}

function normalizeScheduleItems(items = []) {
  return [...items]
    .map((item, index) => {
      const mealOrder = Number(item.mealOrder || index + 1);
      return {
        id: emptyToNull(item.id) || emptyToNull(item.mealId) || `meal_${mealOrder}`,
        mealOrder,
        time: String(item.time).slice(0, 5),
        openDurationMs: Number(item.openDurationMs),
        enabled: item.enabled !== false
      };
    })
    .sort((a, b) => a.mealOrder - b.mealOrder || a.time.localeCompare(b.time) || a.id.localeCompare(b.id))
    .map((item, index) => ({ ...item, mealOrder: index + 1 }));
}

function normalizeFeedingSchedule(schedule = {}) {
  return {
    enabled: schedule.enabled !== false,
    items: normalizeScheduleItems(schedule.items || [])
  };
}

function scheduleForConfig(schedule) {
  return {
    enabled: schedule.enabled,
    items: schedule.items.map((item) => ({
      id: item.id,
      time: item.time,
      openDurationMs: item.openDurationMs,
      enabled: item.enabled
    }))
  };
}

function scheduleJsonForDb(schedule) {
  return JSON.stringify(scheduleForConfig(schedule));
}

function requireDeviceAvailable(device) {
  if (!device) {
    throw notFoundError('Device was not found for this account.', 'DEVICE_NOT_FOUND');
  }

  if (blockedStatuses.has(device.status)) {
    throw badRequestError(`Device is ${device.status}.`, device.status === 'disabled' ? 'DEVICE_DISABLED' : 'DEVICE_REVOKED');
  }
}

async function getOwnedDeviceForConfig(deviceId, userId, executor, lock = false) {
  const normalizedDeviceId = normalizeDeviceId(deviceId);
  const [rows] = await executor.execute(
    `SELECT
      id,
      device_id,
      machine_code,
      owner_user_id,
      device_secret,
      firmware_version,
      status,
      active_config_id,
      active_config_version
     FROM devices
     WHERE device_id = ? AND owner_user_id = ?
     LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
    [normalizedDeviceId, userId]
  );
  return rows[0] || null;
}

async function getCurrentConfigRow(devicePk, executor, lock = false) {
  const [rows] = await executor.execute(
    `SELECT
      id,
      wifi_ssid,
      wifi_password,
      address,
      address_note,
      timezone,
      timezone_offset_sec,
      keep_setup_ap_enabled,
      schedule_enabled,
      schedule_json,
      latest_config_id,
      latest_config_version,
      last_config_generated_at,
      updated_at
     FROM device_current_configs
     WHERE device_id = ?
     LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
    [devicePk]
  );
  return rows[0] || null;
}

async function getActiveMqttCredential(devicePk, executor) {
  const [rows] = await executor.execute(
    `SELECT
      dmc.mqtt_username,
      dmc.mqtt_password,
      ms.host,
      ms.mqtt_port,
      ms.tls_port,
      ms.use_tls
     FROM device_mqtt_credentials dmc
     INNER JOIN mqtt_servers ms ON ms.id = dmc.mqtt_server_id
     WHERE dmc.device_id = ? AND dmc.is_active = TRUE AND ms.is_active = TRUE
     ORDER BY dmc.updated_at DESC, dmc.created_at DESC, dmc.id DESC
     LIMIT 1`,
    [devicePk]
  );
  return rows[0] || null;
}

async function getSavedSchedule(devicePk, currentRow, executor) {
  const [scheduleRows] = await executor.execute(
    `SELECT id, enabled, timezone, timezone_offset_sec
     FROM feeding_schedules
     WHERE device_id = ?
     LIMIT 1`,
    [devicePk]
  );
  const scheduleRow = scheduleRows[0] || null;

  if (scheduleRow) {
    const [itemRows] = await executor.execute(
      `SELECT meal_order, meal_id, time_of_day, open_duration_ms, enabled
       FROM feeding_schedule_items
       WHERE schedule_id = ?
       ORDER BY meal_order ASC, time_of_day ASC, id ASC`,
      [scheduleRow.id]
    );
    return normalizeFeedingSchedule({
      enabled: toBoolean(scheduleRow.enabled),
      items: itemRows.map((row, index) => ({
        id: row.meal_id || `meal_${index + 1}`,
        mealOrder: Number(row.meal_order || index + 1),
        time: String(row.time_of_day).slice(0, 5),
        openDurationMs: Number(row.open_duration_ms),
        enabled: toBoolean(row.enabled)
      }))
    });
  }

  const scheduleJson = parseJsonSetting(currentRow?.schedule_json, null);
  if (scheduleJson) {
    return normalizeFeedingSchedule(scheduleJson);
  }

  return normalizeFeedingSchedule({ enabled: false, items: [] });
}

async function getLatestGenerationVersion(devicePk, executor, lock = false) {
  const [rows] = await executor.execute(
    `SELECT config_version
     FROM device_config_generations
     WHERE device_id = ?
     ORDER BY config_version DESC
     LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
    [devicePk]
  );
  return Number(rows[0]?.config_version || 0);
}

function computeNextConfigVersion(device, currentRow, latestGenerationVersion) {
  return Math.max(
    Number(device.active_config_version || 0),
    Number(currentRow?.latest_config_version || 0),
    Number(latestGenerationVersion || 0)
  ) + 1;
}

export function buildSigningPayloadV3(config, provider = config.provider) {
  const lines = [
    `version=${config.version}`,
    `configId=${config.configId}`,
    `configVersion=${config.configVersion}`,
    `issuedAt=${config.issuedAt}`,
    `expiresAt=${config.expiresAt}`,
    `machineCode=${config.machineCode}`,
    `deviceId=${config.deviceId}`,
    `wifiSsid=${config.wifiSsid}`,
    `wifiPass=${config.wifiPass}`,
    `mqttHost=${config.mqttHost}`,
    `mqttPort=${config.mqttPort}`,
    `mqttUseTls=${boolText(config.mqttUseTls)}`,
    `mqttUser=${config.mqttUser}`,
    `mqttPass=${config.mqttPass}`,
    `timezone=${config.timezone}`,
    `timezoneOffsetSec=${config.timezoneOffsetSec}`,
    `keepSetupApEnabled=${boolText(config.keepSetupApEnabled)}`,
    `schedule.enabled=${boolText(config.feedingSchedule.enabled)}`,
    `schedule.count=${config.feedingSchedule.items.length}`
  ];

  config.feedingSchedule.items.forEach((item, index) => {
    lines.push(`schedule.${index}.id=${item.id}`);
    lines.push(`schedule.${index}.time=${item.time}`);
    lines.push(`schedule.${index}.openDurationMs=${item.openDurationMs}`);
    lines.push(`schedule.${index}.enabled=${boolText(item.enabled)}`);
  });

  const normalizedProvider = normalizeProvider(provider);
  lines.push(`provider.name=${normalizedProvider.name}`);
  lines.push(`provider.brand=${normalizedProvider.brand}`);
  lines.push(`provider.website=${normalizedProvider.website}`);
  lines.push(`provider.contact=${normalizedProvider.contact}`);
  lines.push(`provider.note=${normalizedProvider.note}`);

  return lines.join('\n');
}

export function signConfigPayload(payload, deviceSecret) {
  return crypto.createHmac('sha256', String(deviceSecret)).update(payload, 'utf8').digest('hex');
}

function buildConfigObject({
  configId,
  configVersion,
  issuedAt,
  expiresAt,
  device,
  wifiSsid,
  wifiPassword,
  mqttCredential,
  timezone,
  timezoneOffsetSec,
  keepSetupApEnabled,
  feedingSchedule,
  provider
}) {
  const mqttUseTls = toBoolean(mqttCredential.use_tls);
  const config = {
    version: CONFIG_SCHEMA_VERSION,
    configId,
    configVersion,
    issuedAt,
    expiresAt,
    machineCode: device.machine_code,
    deviceId: device.device_id,
    wifiSsid,
    wifiPass: wifiPassword ?? '',
    mqttHost: mqttCredential.host,
    mqttPort: mqttUseTls ? Number(mqttCredential.tls_port || mqttCredential.mqtt_port || 8883) : Number(mqttCredential.mqtt_port || 1883),
    mqttUseTls,
    mqttUser: mqttCredential.mqtt_username,
    mqttPass: mqttCredential.mqtt_password,
    timezone,
    timezoneOffsetSec: Number(timezoneOffsetSec),
    keepSetupApEnabled: Boolean(keepSetupApEnabled),
    feedingSchedule: scheduleForConfig(feedingSchedule),
    provider: normalizeProvider(provider)
  };

  const payload = buildSigningPayloadV3(config, config.provider);
  config.signature = signConfigPayload(payload, device.device_secret);

  return { config, signingPayload: payload };
}

async function upsertSchedule(devicePk, schedule, timezone, timezoneOffsetSec, executor) {
  const [scheduleResult] = await executor.execute(
    `INSERT INTO feeding_schedules (
      device_id,
      enabled,
      timezone,
      timezone_offset_sec,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, NOW(), NOW())
    ON DUPLICATE KEY UPDATE
      id = LAST_INSERT_ID(id),
      enabled = VALUES(enabled),
      timezone = VALUES(timezone),
      timezone_offset_sec = VALUES(timezone_offset_sec),
      updated_at = NOW()`,
    [devicePk, schedule.enabled, timezone, timezoneOffsetSec]
  );

  const scheduleId = scheduleResult.insertId;
  await executor.execute('DELETE FROM feeding_schedule_items WHERE schedule_id = ?', [scheduleId]);

  for (const [index, item] of schedule.items.entries()) {
    await executor.execute(
      `INSERT INTO feeding_schedule_items (
        schedule_id,
        meal_order,
        meal_id,
        time_of_day,
        open_duration_ms,
        enabled,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [scheduleId, index + 1, item.id, `${item.time}:00`, item.openDurationMs, item.enabled]
    );
  }
}

async function persistGeneratedConfig({
  connection,
  device,
  userId,
  input,
  config,
  currentRow,
  feedingSchedule,
  context,
  regenerate = false
}) {
  await connection.execute(
    `INSERT INTO device_current_configs (
      device_id,
      wifi_ssid,
      wifi_password,
      address,
      address_note,
      timezone,
      timezone_offset_sec,
      keep_setup_ap_enabled,
      schedule_enabled,
      schedule_json,
      latest_config_id,
      latest_config_version,
      last_config_generated_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ON DUPLICATE KEY UPDATE
      wifi_ssid = VALUES(wifi_ssid),
      wifi_password = VALUES(wifi_password),
      address = VALUES(address),
      address_note = VALUES(address_note),
      timezone = VALUES(timezone),
      timezone_offset_sec = VALUES(timezone_offset_sec),
      keep_setup_ap_enabled = VALUES(keep_setup_ap_enabled),
      schedule_enabled = VALUES(schedule_enabled),
      schedule_json = VALUES(schedule_json),
      latest_config_id = VALUES(latest_config_id),
      latest_config_version = VALUES(latest_config_version),
      last_config_generated_at = NOW(),
      updated_at = NOW()`,
    [
      device.id,
      config.wifiSsid,
      config.wifiPass,
      input.address,
      input.addressNote,
      config.timezone,
      config.timezoneOffsetSec,
      config.keepSetupApEnabled,
      feedingSchedule.enabled,
      scheduleJsonForDb(feedingSchedule),
      config.configId,
      config.configVersion
    ]
  );

  await upsertSchedule(device.id, feedingSchedule, config.timezone, config.timezoneOffsetSec, connection);

  await connection.execute(
    `INSERT INTO device_config_generations (
      device_id,
      generated_by_user_id,
      config_id,
      config_version,
      config_schema_version,
      issued_at,
      expires_at,
      wifi_ssid,
      wifi_password,
      address,
      address_note,
      mqtt_use_tls,
      mqtt_port,
      keep_setup_ap_enabled,
      schedule_enabled,
      schedule_item_count,
      signature_hash,
      client_ip,
      user_agent,
      status,
      created_at
    ) VALUES (?, ?, ?, ?, ?, FROM_UNIXTIME(?), FROM_UNIXTIME(?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'generated', NOW())`,
    [
      device.id,
      userId,
      config.configId,
      config.configVersion,
      CONFIG_SCHEMA_VERSION,
      config.issuedAt,
      config.expiresAt,
      config.wifiSsid,
      config.wifiPass,
      input.address,
      input.addressNote,
      config.mqttUseTls,
      config.mqttPort,
      config.keepSetupApEnabled,
      feedingSchedule.enabled,
      feedingSchedule.items.length,
      config.signature,
      context.clientIp,
      context.userAgent
    ]
  );

  if (!['online', 'configured'].includes(device.status)) {
    await connection.execute(
      `UPDATE devices SET status = 'config_generated', updated_at = NOW() WHERE id = ?`,
      [device.id]
    );
  }

  await writeAuditLog({
    actorUserId: userId,
    action: regenerate ? 'user.device.config_file.regenerate' : 'user.device.config_file.generate',
    targetType: 'device',
    targetId: device.device_id,
    payload: {
      deviceId: device.device_id,
      configId: config.configId,
      configVersion: config.configVersion,
      configSchemaVersion: CONFIG_SCHEMA_VERSION,
      hasWifiPassword: Boolean(config.wifiPass && String(config.wifiPass).length > 0),
      scheduleEnabled: feedingSchedule.enabled,
      scheduleItemCount: feedingSchedule.items.length,
      keepSetupApEnabled: config.keepSetupApEnabled,
      reusedCurrentConfig: Boolean(currentRow),
      regenerate
    },
    clientIp: context.clientIp,
    userAgent: context.userAgent,
    connection
  });
}

function prepareInputFromRequest(input, defaults) {
  const feedingSchedule = normalizeFeedingSchedule(input.feedingSchedule || { enabled: false, items: [] });
  return {
    wifiSsid: input.wifiSsid.trim(),
    wifiPassword: input.wifiPassword ?? '',
    address: emptyToNull(input.address),
    addressNote: emptyToNull(input.addressNote),
    timezone: normalizeTimezone(input.timezone, defaults.defaultTimezone),
    timezoneOffsetSec: normalizeTimezoneOffset(input.timezoneOffsetSec, defaults.defaultTimezoneOffsetSec),
    keepSetupApEnabled: input.keepSetupApEnabled ?? defaults.defaultKeepSetupApEnabled,
    feedingSchedule
  };
}

function prepareInputFromCurrent(currentRow, savedSchedule, defaults) {
  if (!currentRow?.wifi_ssid) {
    throw badRequestError('Current config is missing Wi-Fi SSID.', 'NEED_WIFI_SSID');
  }

  if (currentRow.wifi_password === null || currentRow.wifi_password === undefined) {
    throw badRequestError('Current config is missing Wi-Fi password. Generate config with wifiPassword first.', 'NEED_WIFI_PASSWORD');
  }

  return {
    wifiSsid: currentRow.wifi_ssid,
    wifiPassword: currentRow.wifi_password,
    address: currentRow.address || null,
    addressNote: currentRow.address_note || null,
    timezone: normalizeTimezone(currentRow.timezone, defaults.defaultTimezone),
    timezoneOffsetSec: normalizeTimezoneOffset(currentRow.timezone_offset_sec, defaults.defaultTimezoneOffsetSec),
    keepSetupApEnabled: toBoolean(currentRow.keep_setup_ap_enabled),
    feedingSchedule: savedSchedule
  };
}

async function generateConfigFileInternal({ deviceId, userId, input, context, regenerate = false }) {
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();

    const device = await getOwnedDeviceForConfig(deviceId, userId, connection, true);
    requireDeviceAvailable(device);

    const currentRow = await getCurrentConfigRow(device.id, connection, true);
    const mqttCredential = await getActiveMqttCredential(device.id, connection);
    if (!mqttCredential) {
      throw badRequestError('Active MQTT credential/server was not found for this device.', 'MQTT_CREDENTIAL_NOT_FOUND');
    }

    const defaults = await getServerDefaultSettings(connection);
    const provider = await getProviderSettings(connection);
    const savedSchedule = await getSavedSchedule(device.id, currentRow, connection);
    const preparedInput = regenerate
      ? prepareInputFromCurrent(currentRow, savedSchedule, defaults)
      : prepareInputFromRequest(input, defaults);

    const latestGenerationVersion = await getLatestGenerationVersion(device.id, connection, true);
    const configVersion = computeNextConfigVersion(device, currentRow, latestGenerationVersion);
    const now = new Date();
    const issuedAt = epochSeconds(now);
    const ttlSec = Number(defaults.configFileTtlSec || 1800);
    const expiresAt = issuedAt + ttlSec;
    const configId = createConfigId(device.device_id, now);

    const { config, signingPayload } = buildConfigObject({
      configId,
      configVersion,
      issuedAt,
      expiresAt,
      device,
      wifiSsid: preparedInput.wifiSsid,
      wifiPassword: preparedInput.wifiPassword,
      mqttCredential,
      timezone: preparedInput.timezone,
      timezoneOffsetSec: preparedInput.timezoneOffsetSec,
      keepSetupApEnabled: preparedInput.keepSetupApEnabled,
      feedingSchedule: preparedInput.feedingSchedule,
      provider
    });

    await persistGeneratedConfig({
      connection,
      device,
      userId,
      input: preparedInput,
      config,
      currentRow,
      feedingSchedule: preparedInput.feedingSchedule,
      context,
      regenerate
    });

    await connection.commit();

    const content = JSON.stringify(config, null, 2);
    return {
      fileName: device.device_id,
      configId: config.configId,
      configVersion: config.configVersion,
      issuedAt: config.issuedAt,
      expiresAt: config.expiresAt,
      content,
      contentLength: Buffer.byteLength(content, 'utf8'),
      signature: config.signature,
      signingPayloadLineCount: signingPayload.split('\n').length,
      config
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function generateConfigFile(deviceId, userId, input, context) {
  return generateConfigFileInternal({ deviceId, userId, input, context, regenerate: false });
}

export async function regenerateConfigFile(deviceId, userId, context) {
  return generateConfigFileInternal({ deviceId, userId, input: {}, context, regenerate: true });
}

export async function listConfigGenerations(deviceId, userId, { page = 1, limit = 20 } = {}) {
  const device = await getOwnedDeviceForConfig(deviceId, userId, getPool(), false);
  requireDeviceAvailable(device);

  const normalizedPage = Number(page || 1);
  const normalizedLimit = Number(limit || 20);
  const offset = (normalizedPage - 1) * normalizedLimit;

  const [[countRow]] = await getPool().execute(
    `SELECT COUNT(*) AS total FROM device_config_generations WHERE device_id = ?`,
    [device.id]
  );

  const [rows] = await getPool().execute(
    `SELECT
      config_id,
      config_version,
      config_schema_version,
      issued_at,
      expires_at,
      wifi_ssid,
      address,
      address_note,
      mqtt_use_tls,
      mqtt_port,
      keep_setup_ap_enabled,
      schedule_enabled,
      schedule_item_count,
      status,
      created_at
     FROM device_config_generations
     WHERE device_id = ?
     ORDER BY config_version DESC, id DESC
     LIMIT ${normalizedLimit} OFFSET ${offset}`,
    [device.id]
  );

  return {
    items: rows.map((row) => ({
      configId: row.config_id,
      configVersion: Number(row.config_version),
      configSchemaVersion: Number(row.config_schema_version),
      issuedAt: toIso(row.issued_at),
      expiresAt: toIso(row.expires_at),
      wifiSsid: row.wifi_ssid,
      address: row.address,
      addressNote: row.address_note,
      mqttUseTls: toBoolean(row.mqtt_use_tls),
      mqttPort: Number(row.mqtt_port),
      keepSetupApEnabled: toBoolean(row.keep_setup_ap_enabled),
      scheduleEnabled: toBoolean(row.schedule_enabled),
      scheduleItemCount: Number(row.schedule_item_count || 0),
      status: row.status,
      createdAt: toIso(row.created_at)
    })),
    pagination: {
      page: normalizedPage,
      limit: normalizedLimit,
      total: Number(countRow?.total || 0),
      totalPages: Math.ceil(Number(countRow?.total || 0) / normalizedLimit)
    }
  };
}

export const __phase7Internals = {
  buildSigningPayloadV3,
  signConfigPayload,
  normalizeFeedingSchedule,
  scheduleForConfig,
  computeNextConfigVersion
};
