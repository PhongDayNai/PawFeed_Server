import { env } from '../config/env.js';

function parseJsonSetting(value, fallback = null) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return typeof value === 'string' ? value : fallback;
  }
}

function toNumber(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
}

function cleanString(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return String(value);
}

export const SYSTEM_SETTING_KEYS = Object.freeze({
  CONFIG_FILE_TTL_SEC: 'CONFIG_FILE_TTL_SEC',
  DEVICE_ONLINE_TTL_SEC: 'DEVICE_ONLINE_TTL_SEC',
  COMMAND_ACK_TIMEOUT_SEC: 'COMMAND_ACK_TIMEOUT_SEC',
  COMMAND_COMPLETE_TIMEOUT_SEC: 'COMMAND_COMPLETE_TIMEOUT_SEC',
  DEFAULT_TIMEZONE: 'DEFAULT_TIMEZONE',
  DEFAULT_TIMEZONE_OFFSET_SEC: 'DEFAULT_TIMEZONE_OFFSET_SEC',
  DEFAULT_KEEP_SETUP_AP_ENABLED: 'DEFAULT_KEEP_SETUP_AP_ENABLED',
  DEFAULT_MQTT_USE_TLS: 'DEFAULT_MQTT_USE_TLS',
  ALLOW_DEMO_KEEP_SETUP_AP: 'ALLOW_DEMO_KEEP_SETUP_AP',
  PROVIDER_NAME: 'PROVIDER_NAME',
  PROVIDER_BRAND: 'PROVIDER_BRAND',
  PROVIDER_WEBSITE: 'PROVIDER_WEBSITE',
  PROVIDER_CONTACT: 'PROVIDER_CONTACT',
  PROVIDER_NOTE: 'PROVIDER_NOTE'
});

export function defaultProviderSettings() {
  return {
    name: env.provider.name,
    brand: env.provider.brand,
    website: env.provider.website,
    contact: env.provider.contact,
    note: env.provider.note
  };
}

export function defaultServerDefaultSettings() {
  return {
    configFileTtlSec: env.configFile.ttlSec,
    defaultTimezone: env.configFile.defaultTimezone,
    defaultTimezoneOffsetSec: env.configFile.defaultTimezoneOffsetSec,
    defaultKeepSetupApEnabled: env.configFile.defaultKeepSetupApEnabled,
    defaultMqttUseTls: env.configFile.defaultMqttUseTls,
    allowDemoKeepSetupAp: env.configFile.allowDemoKeepSetupAp
  };
}

export function defaultWorkerTimeoutSettings() {
  return {
    deviceOnlineTtlSec: env.workers.deviceOnlineTtlSec,
    commandAckTimeoutSec: env.workers.commandAckTimeoutSec,
    commandCompleteTimeoutSec: env.workers.commandCompleteTimeoutSec
  };
}

function normalizeProvider(provider = defaultProviderSettings()) {
  const fallback = defaultProviderSettings();
  return {
    name: cleanString(provider.name, fallback.name),
    brand: cleanString(provider.brand, fallback.brand),
    website: cleanString(provider.website, fallback.website),
    contact: cleanString(provider.contact, fallback.contact),
    note: cleanString(provider.note, fallback.note)
  };
}

function normalizeServerDefaults(value = defaultServerDefaultSettings()) {
  const fallback = defaultServerDefaultSettings();
  return {
    configFileTtlSec: Math.max(1, toNumber(value.configFileTtlSec, fallback.configFileTtlSec)),
    defaultTimezone: cleanString(value.defaultTimezone, fallback.defaultTimezone),
    defaultTimezoneOffsetSec: toNumber(value.defaultTimezoneOffsetSec, fallback.defaultTimezoneOffsetSec),
    defaultKeepSetupApEnabled: toBoolean(value.defaultKeepSetupApEnabled, fallback.defaultKeepSetupApEnabled),
    defaultMqttUseTls: toBoolean(value.defaultMqttUseTls, fallback.defaultMqttUseTls),
    allowDemoKeepSetupAp: toBoolean(value.allowDemoKeepSetupAp, fallback.allowDemoKeepSetupAp)
  };
}

function normalizeWorkerTimeouts(value = defaultWorkerTimeoutSettings()) {
  const fallback = defaultWorkerTimeoutSettings();
  return {
    deviceOnlineTtlSec: Math.max(1, toNumber(value.deviceOnlineTtlSec, fallback.deviceOnlineTtlSec)),
    commandAckTimeoutSec: Math.max(1, toNumber(value.commandAckTimeoutSec, fallback.commandAckTimeoutSec)),
    commandCompleteTimeoutSec: Math.max(1, toNumber(value.commandCompleteTimeoutSec, fallback.commandCompleteTimeoutSec))
  };
}

async function readRows(executor) {
  if (!executor?.execute) return [];
  try {
    const [rows] = await executor.execute(
      `SELECT setting_key, setting_value, description, created_at, updated_at FROM system_settings`
    );
    return rows || [];
  } catch (error) {
    // Settings are optional during early migrations/tests; fall back to env safely.
    if (
      ['ER_NO_SUCH_TABLE', 'ER_BAD_DB_ERROR', 'ER_ACCESS_DENIED_ERROR'].includes(error?.code) ||
      /system_settings/i.test(error?.message || '')
    ) {
      return [];
    }
    throw error;
  }
}

function rowsToMap(rows = []) {
  const map = new Map();
  for (const row of rows) {
    map.set(row.setting_key, parseJsonSetting(row.setting_value, null));
  }
  return map;
}

export async function getSystemSettingMap(executor) {
  return rowsToMap(await readRows(executor));
}

export async function getProviderSettings(executor) {
  const map = await getSystemSettingMap(executor);
  const groupedProvider = parseJsonSetting(map.get('provider'), {});
  return normalizeProvider({
    ...defaultProviderSettings(),
    ...groupedProvider,
    ...(map.has(SYSTEM_SETTING_KEYS.PROVIDER_NAME) ? { name: map.get(SYSTEM_SETTING_KEYS.PROVIDER_NAME) } : {}),
    ...(map.has(SYSTEM_SETTING_KEYS.PROVIDER_BRAND) ? { brand: map.get(SYSTEM_SETTING_KEYS.PROVIDER_BRAND) } : {}),
    ...(map.has(SYSTEM_SETTING_KEYS.PROVIDER_WEBSITE) ? { website: map.get(SYSTEM_SETTING_KEYS.PROVIDER_WEBSITE) } : {}),
    ...(map.has(SYSTEM_SETTING_KEYS.PROVIDER_CONTACT) ? { contact: map.get(SYSTEM_SETTING_KEYS.PROVIDER_CONTACT) } : {}),
    ...(map.has(SYSTEM_SETTING_KEYS.PROVIDER_NOTE) ? { note: map.get(SYSTEM_SETTING_KEYS.PROVIDER_NOTE) } : {})
  });
}

export async function getServerDefaultSettings(executor) {
  const map = await getSystemSettingMap(executor);
  const groupedDefaults = parseJsonSetting(map.get('server_defaults'), {});
  return normalizeServerDefaults({
    ...defaultServerDefaultSettings(),
    ...groupedDefaults,
    ...(map.has(SYSTEM_SETTING_KEYS.CONFIG_FILE_TTL_SEC) ? { configFileTtlSec: map.get(SYSTEM_SETTING_KEYS.CONFIG_FILE_TTL_SEC) } : {}),
    ...(map.has(SYSTEM_SETTING_KEYS.DEFAULT_TIMEZONE) ? { defaultTimezone: map.get(SYSTEM_SETTING_KEYS.DEFAULT_TIMEZONE) } : {}),
    ...(map.has(SYSTEM_SETTING_KEYS.DEFAULT_TIMEZONE_OFFSET_SEC) ? { defaultTimezoneOffsetSec: map.get(SYSTEM_SETTING_KEYS.DEFAULT_TIMEZONE_OFFSET_SEC) } : {}),
    ...(map.has(SYSTEM_SETTING_KEYS.DEFAULT_KEEP_SETUP_AP_ENABLED) ? { defaultKeepSetupApEnabled: map.get(SYSTEM_SETTING_KEYS.DEFAULT_KEEP_SETUP_AP_ENABLED) } : {}),
    ...(map.has(SYSTEM_SETTING_KEYS.DEFAULT_MQTT_USE_TLS) ? { defaultMqttUseTls: map.get(SYSTEM_SETTING_KEYS.DEFAULT_MQTT_USE_TLS) } : {}),
    ...(map.has(SYSTEM_SETTING_KEYS.ALLOW_DEMO_KEEP_SETUP_AP) ? { allowDemoKeepSetupAp: map.get(SYSTEM_SETTING_KEYS.ALLOW_DEMO_KEEP_SETUP_AP) } : {})
  });
}

export async function getWorkerTimeoutSettings(executor) {
  const map = await getSystemSettingMap(executor);
  return normalizeWorkerTimeouts({
    ...defaultWorkerTimeoutSettings(),
    ...(map.has(SYSTEM_SETTING_KEYS.DEVICE_ONLINE_TTL_SEC) ? { deviceOnlineTtlSec: map.get(SYSTEM_SETTING_KEYS.DEVICE_ONLINE_TTL_SEC) } : {}),
    ...(map.has(SYSTEM_SETTING_KEYS.COMMAND_ACK_TIMEOUT_SEC) ? { commandAckTimeoutSec: map.get(SYSTEM_SETTING_KEYS.COMMAND_ACK_TIMEOUT_SEC) } : {}),
    ...(map.has(SYSTEM_SETTING_KEYS.COMMAND_COMPLETE_TIMEOUT_SEC) ? { commandCompleteTimeoutSec: map.get(SYSTEM_SETTING_KEYS.COMMAND_COMPLETE_TIMEOUT_SEC) } : {})
  });
}

export async function getEffectiveSystemSettings(executor) {
  const [provider, serverDefaults, workerTimeouts] = await Promise.all([
    getProviderSettings(executor),
    getServerDefaultSettings(executor),
    getWorkerTimeoutSettings(executor)
  ]);

  return {
    provider,
    serverDefaults,
    workerTimeouts,
    settingKeys: SYSTEM_SETTING_KEYS
  };
}

export const __systemSettingsInternals = {
  parseJsonSetting,
  normalizeProvider,
  normalizeServerDefaults,
  normalizeWorkerTimeouts,
  rowsToMap
};
