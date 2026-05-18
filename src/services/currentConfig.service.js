import { getPool } from '../config/db.js';
import { badRequestError } from '../utils/errors.js';
import { emptyToNull, normalizeDeviceId } from '../utils/normalize.js';
import { assertOwnedDevice } from './device.service.js';
import { writeAuditLog } from './audit.service.js';
import { getServerDefaultSettings } from './systemSettings.service.js';

const FALLBACK_TIMEZONE = 'Asia/Bangkok';
const FALLBACK_TIMEZONE_OFFSET_SEC = 25200;

function toBoolean(value) {
  return Boolean(Number(value));
}

function toIso(value) {
  return value ? new Date(value).toISOString() : null;
}

function normalizeTimezone(value, fallback = FALLBACK_TIMEZONE) {
  const normalized = emptyToNull(value);
  return normalized || fallback;
}

function normalizeTimezoneOffset(value, fallback = FALLBACK_TIMEZONE_OFFSET_SEC) {
  if (value === undefined || value === null || value === '') return fallback;
  return Number(value);
}

function normalizeScheduleItems(items = []) {
  return [...items]
    .map((item, index) => ({
      time: String(item.time).slice(0, 5),
      openDurationMs: Number(item.openDurationMs),
      daysOfWeek: Array.isArray(item.daysOfWeek) ? item.daysOfWeek : [0, 1, 2, 3, 4, 5, 6],
      mealOrder: Number(item.mealOrder || index + 1),
      mealId: item.mealId || `meal_${index + 1}`
    }))
    .sort((a, b) => a.mealOrder - b.mealOrder || a.time.localeCompare(b.time));
}

function scheduleJsonFromInput(schedule) {
  return {
    enabled: schedule.enabled !== false,
    items: normalizeScheduleItems(schedule.entries || []).map((item, index) => ({
      id: item.mealId || `meal_${index + 1}`,
      time: item.time,
      openDurationMs: item.openDurationMs,
      daysOfWeek: item.daysOfWeek,
      enabled: true
    }))
  };
}

function toScheduleResponse(scheduleRow, itemRows = [], deviceId = undefined, defaults = {}) {
  const enabled = scheduleRow ? toBoolean(scheduleRow.enabled) : false;
  const timezone = scheduleRow?.timezone || defaults.defaultTimezone || FALLBACK_TIMEZONE;
  const timezoneOffsetSec = Number(scheduleRow?.timezone_offset_sec ?? defaults.defaultTimezoneOffsetSec ?? FALLBACK_TIMEZONE_OFFSET_SEC);
  const entries = itemRows.map((row) => ({
    id: Number(row.id),
    mealId: row.meal_id,
    mealOrder: Number(row.meal_order),
    time: String(row.time_of_day).slice(0, 5),
    openDurationMs: Number(row.open_duration_ms),
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    enabled: toBoolean(row.enabled)
  }));

  return {
    ...(deviceId ? { deviceId } : {}),
    enabled,
    timezone,
    timezoneOffsetSec,
    entries,
    createdAt: toIso(scheduleRow?.created_at),
    updatedAt: toIso(scheduleRow?.updated_at)
  };
}

function toCurrentConfigResponse(deviceRow, currentRow, schedule, defaults = {}) {
  const timezone = currentRow?.timezone || schedule.timezone || defaults.defaultTimezone || FALLBACK_TIMEZONE;
  const timezoneOffsetSec = Number(currentRow?.timezone_offset_sec ?? schedule.timezoneOffsetSec ?? defaults.defaultTimezoneOffsetSec ?? FALLBACK_TIMEZONE_OFFSET_SEC);

  return {
    deviceId: deviceRow.device_id,
    wifiSsid: currentRow?.wifi_ssid || null,
    hasWifiPassword: Boolean(currentRow?.wifi_password && String(currentRow.wifi_password).length > 0),
    address: currentRow?.address || null,
    addressNote: currentRow?.address_note || null,
    timezone,
    timezoneOffsetSec,
    keepSetupApEnabled: currentRow ? toBoolean(currentRow.keep_setup_ap_enabled) : Boolean(defaults.defaultKeepSetupApEnabled),
    scheduleEnabled: schedule.enabled,
    schedule: {
      entries: schedule.entries.map((item) => ({
        time: item.time,
        openDurationMs: item.openDurationMs,
        daysOfWeek: item.daysOfWeek
      }))
    },
    latestConfigId: currentRow?.latest_config_id || null,
    latestConfigVersion: Number(currentRow?.latest_config_version || 0),
    activeConfigId: deviceRow.active_config_id || null,
    activeConfigVersion: Number(deviceRow.active_config_version || 0),
    lastConfigGeneratedAt: toIso(currentRow?.last_config_generated_at),
    updatedAt: toIso(currentRow?.updated_at)
  };
}

async function getCurrentConfigRow(devicePk, executor = getPool(), lock = false) {
  const [rows] = await executor.execute(
    `SELECT
      id,
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
     FROM device_current_configs
     WHERE device_id = ?
     LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
    [devicePk]
  );
  return rows[0] || null;
}

async function getScheduleRows(devicePk, executor = getPool(), lock = false) {
  const [scheduleRows] = await executor.execute(
    `SELECT id, device_id, enabled, timezone, timezone_offset_sec, created_at, updated_at
     FROM feeding_schedules
     WHERE device_id = ?
     LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
    [devicePk]
  );

  const scheduleRow = scheduleRows[0] || null;
  if (!scheduleRow) {
    return { scheduleRow: null, itemRows: [] };
  }

  const [itemRows] = await executor.execute(
    `SELECT id, schedule_id, meal_order, meal_id, time_of_day, open_duration_ms, enabled, created_at, updated_at
     FROM feeding_schedule_items
     WHERE schedule_id = ?
     ORDER BY meal_order ASC, time_of_day ASC, id ASC`,
    [scheduleRow.id]
  );

  return { scheduleRow, itemRows };
}

async function getScheduleForDevicePk(devicePk, executor = getPool(), deviceId = undefined, defaults = undefined) {
  const effectiveDefaults = defaults || await getServerDefaultSettings(executor);
  const { scheduleRow, itemRows } = await getScheduleRows(devicePk, executor);
  return toScheduleResponse(scheduleRow, itemRows, deviceId, effectiveDefaults);
}

function assertDeviceCanSaveConfig(deviceRow) {
  if (deviceRow.status === 'disabled') {
    throw badRequestError('Device is disabled.', 'DEVICE_DISABLED');
  }

  if (deviceRow.status === 'revoked') {
    throw badRequestError('Device is revoked.', 'DEVICE_REVOKED');
  }
}

export async function getDeviceCurrentConfig(deviceId, userId) {
  const device = await assertOwnedDevice(deviceId, userId);
  const defaults = await getServerDefaultSettings(getPool());
  const [currentRow, schedule] = await Promise.all([
    getCurrentConfigRow(device.id),
    getScheduleForDevicePk(device.id, getPool(), device.device_id, defaults)
  ]);

  return toCurrentConfigResponse(device, currentRow, schedule, defaults);
}

export async function saveDeviceCurrentConfig(deviceId, userId, input, context) {
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();

    const device = await assertOwnedDevice(deviceId, userId, connection);
    assertDeviceCanSaveConfig(device);

    const currentRow = await getCurrentConfigRow(device.id, connection, true);
    const defaults = await getServerDefaultSettings(connection);

    const wifiSsid = input.wifiSsid !== null && input.wifiSsid !== undefined ? input.wifiSsid.trim() : null;
    const wifiPassword = Object.prototype.hasOwnProperty.call(input, 'wifiPassword')
      ? input.wifiPassword ?? ''
      : currentRow?.wifi_password ?? null;
    const address = emptyToNull(input.address);
    const addressNote = emptyToNull(input.addressNote);
    const timezone = normalizeTimezone(input.timezone, currentRow?.timezone || defaults.defaultTimezone);
    const timezoneOffsetSec = normalizeTimezoneOffset(input.timezoneOffsetSec, currentRow?.timezone_offset_sec ?? defaults.defaultTimezoneOffsetSec);
    const keepSetupApEnabled = Object.prototype.hasOwnProperty.call(input, 'keepSetupApEnabled')
      ? input.keepSetupApEnabled === true
      : (currentRow ? toBoolean(currentRow.keep_setup_ap_enabled) : Boolean(defaults.defaultKeepSetupApEnabled));

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
        latest_config_id,
        latest_config_version,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, FALSE), NULL, 0, NOW())
      ON DUPLICATE KEY UPDATE
        wifi_ssid = VALUES(wifi_ssid),
        wifi_password = VALUES(wifi_password),
        address = VALUES(address),
        address_note = VALUES(address_note),
        timezone = VALUES(timezone),
        timezone_offset_sec = VALUES(timezone_offset_sec),
        keep_setup_ap_enabled = VALUES(keep_setup_ap_enabled),
        updated_at = NOW()`,
      [
        device.id,
        wifiSsid,
        wifiPassword,
        address,
        addressNote,
        timezone,
        timezoneOffsetSec,
        keepSetupApEnabled,
        currentRow?.schedule_enabled ?? false
      ]
    );

    await writeAuditLog({
      actorUserId: userId,
      action: 'user.device.current_config.save',
      targetType: 'device',
      targetId: device.device_id,
      payload: {
        deviceId: device.device_id,
        wifiSsid,
        hasWifiPassword: Boolean(wifiPassword && String(wifiPassword).length > 0),
        addressUpdated: address !== null,
        addressNoteUpdated: addressNote !== null,
        timezone,
        timezoneOffsetSec,
        keepSetupApEnabled
      },
      clientIp: context.clientIp,
      userAgent: context.userAgent,
      connection
    });

    await connection.commit();

    return getDeviceCurrentConfig(device.device_id, userId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getDeviceSchedule(deviceId, userId) {
  const device = await assertOwnedDevice(deviceId, userId);
  const defaults = await getServerDefaultSettings(getPool());
  return getScheduleForDevicePk(device.id, getPool(), device.device_id, defaults);
}

export async function saveDeviceSchedule(deviceId, userId, input, context) {
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();

    const device = await assertOwnedDevice(deviceId, userId, connection);
    assertDeviceCanSaveConfig(device);
    const defaults = await getServerDefaultSettings(connection);

    const timezone = normalizeTimezone(input.timezone, defaults.defaultTimezone);
    const timezoneOffsetSec = normalizeTimezoneOffset(input.timezoneOffsetSec, defaults.defaultTimezoneOffsetSec);
    const enabled = input.enabled !== false;
    const normalizedItems = normalizeScheduleItems(input.entries || []);
    const scheduleJson = scheduleJsonFromInput({ enabled, entries: normalizedItems });

    const [scheduleResult] = await connection.execute(
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
      [device.id, enabled, timezone, timezoneOffsetSec]
    );

    const scheduleId = scheduleResult.insertId;

    await connection.execute('DELETE FROM feeding_schedule_items WHERE schedule_id = ?', [scheduleId]);

    for (const [index, item] of normalizedItems.entries()) {
      await connection.execute(
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
        [
          scheduleId,
          index + 1,
          item.mealId || `meal_${index + 1}`,
          `${item.time}:00`,
          item.openDurationMs,
          true
        ]
      );
    }

    await connection.execute(
      `INSERT INTO device_current_configs (
        device_id,
        timezone,
        timezone_offset_sec,
        schedule_enabled,
        schedule_json,
        latest_config_id,
        latest_config_version,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, NULL, 0, NOW())
      ON DUPLICATE KEY UPDATE
        timezone = VALUES(timezone),
        timezone_offset_sec = VALUES(timezone_offset_sec),
        schedule_enabled = VALUES(schedule_enabled),
        schedule_json = VALUES(schedule_json),
        updated_at = NOW()`,
      [device.id, timezone, timezoneOffsetSec, enabled, JSON.stringify(scheduleJson)]
    );

    await writeAuditLog({
      actorUserId: userId,
      action: 'user.device.schedule.save',
      targetType: 'device',
      targetId: device.device_id,
      payload: {
        deviceId: device.device_id,
        enabled,
        timezone,
        timezoneOffsetSec,
        itemCount: normalizedItems.length
      },
      clientIp: context.clientIp,
      userAgent: context.userAgent,
      connection
    });

    await connection.commit();

    return getDeviceSchedule(device.device_id, userId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getDeviceScheduleApplyStatus(deviceId, userId) {
  const device = await assertOwnedDevice(deviceId, userId);
  const normalizedDeviceId = normalizeDeviceId(deviceId);
  const [currentRows] = await getPool().execute(
    `SELECT
      latest_config_id,
      latest_config_version,
      last_config_generated_at,
      schedule_enabled,
      schedule_json,
      updated_at
     FROM device_current_configs
     WHERE device_id = ?
     LIMIT 1`,
    [device.id]
  );

  const current = currentRows[0] || null;
  const { scheduleRow } = await getScheduleRows(device.id);
  const latestConfigVersion = Number(current?.latest_config_version || 0);
  const activeConfigVersion = Number(device.active_config_version || 0);
  const latestConfigId = current?.latest_config_id || null;
  const activeConfigId = device.active_config_id || null;
  const scheduleUpdatedAt = scheduleRow?.updated_at ? new Date(scheduleRow.updated_at).getTime() : null;
  const lastGeneratedAt = current?.last_config_generated_at ? new Date(current.last_config_generated_at).getTime() : null;
  const scheduleSaved = Boolean(scheduleRow || current?.schedule_json);
  const needsConfigGeneration = Boolean(scheduleSaved && (!lastGeneratedAt || (scheduleUpdatedAt && scheduleUpdatedAt > lastGeneratedAt)));
  const needsDeviceApply = Boolean(latestConfigVersion > activeConfigVersion || (latestConfigId && latestConfigId !== activeConfigId));

  let status = 'not_configured';
  if (needsConfigGeneration) {
    status = 'pending_config_generation';
  } else if (needsDeviceApply) {
    status = 'pending_device_apply';
  } else if (latestConfigVersion > 0 && !needsDeviceApply) {
    status = 'applied';
  }

  return {
    deviceId: normalizedDeviceId,
    status,
    scheduleSaved,
    needsConfigGeneration,
    needsDeviceApply,
    latestConfigId,
    latestConfigVersion,
    activeConfigId,
    activeConfigVersion,
    lastConfigGeneratedAt: toIso(current?.last_config_generated_at),
    currentConfigUpdatedAt: toIso(current?.updated_at),
    scheduleUpdatedAt: toIso(scheduleRow?.updated_at)
  };
}

export const __phase6Internals = {
  normalizeScheduleItems,
  scheduleJsonFromInput,
  toScheduleResponse,
  toCurrentConfigResponse
};
