import dotenv from 'dotenv';

dotenv.config();

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
}

function parseCorsOrigins(value) {
  if (!value || value.trim() === '*') return '*';
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  appName: process.env.APP_NAME || 'pet-feeder-server',
  appVersion: process.env.APP_VERSION || '4.1',
  host: process.env.HOST || '0.0.0.0',
  port: parseInteger(process.env.PORT, 3000),
  corsOrigin: parseCorsOrigins(process.env.CORS_ORIGIN),
  jsonBodyLimit: process.env.JSON_BODY_LIMIT || '1mb',
  rateLimitWindowMs: parseInteger(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
  rateLimitMax: parseInteger(process.env.RATE_LIMIT_MAX, 120),
  enableDevErrorRoute: parseBoolean(process.env.ENABLE_DEV_ERROR_ROUTE, false),
  isProduction: process.env.NODE_ENV === 'production',

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInteger(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pet_feeder_iot',
    connectionLimit: parseInteger(process.env.DB_CONNECTION_LIMIT, 10),
    ssl: parseBoolean(process.env.DB_SSL, false),
    allowReset: parseBoolean(process.env.DB_ALLOW_RESET, false)
  },

  configFile: {
    ttlSec: parseInteger(process.env.CONFIG_FILE_TTL_SEC, 1800),
    defaultTimezone: process.env.DEFAULT_TIMEZONE || 'Asia/Bangkok',
    defaultTimezoneOffsetSec: parseInteger(process.env.DEFAULT_TIMEZONE_OFFSET_SEC, 25200),
    defaultKeepSetupApEnabled: parseBoolean(process.env.DEFAULT_KEEP_SETUP_AP_ENABLED, false)
  },

  provider: {
    name: process.env.PROVIDER_NAME || 'Phong Dương Hùng',
    brand: process.env.PROVIDER_BRAND || 'Pet Feeder IoT',
    website: process.env.PROVIDER_WEBSITE || 'https://your-domain.com',
    contact: process.env.PROVIDER_CONTACT || 'your-email@example.com',
    note: process.env.PROVIDER_NOTE || 'Thiết bị và file cấu hình được cung cấp bởi Phong Dương Hùng.'
  },

  auth: {
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'change_this_access_secret_in_production',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'change_this_refresh_secret_in_production',
    jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    bcryptSaltRounds: parseInteger(process.env.BCRYPT_SALT_ROUNDS, 12)
  },

  seed: {
    adminFullName: process.env.SEED_ADMIN_FULL_NAME || 'System Admin',
    adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@example.com',
    adminPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin@123456',
    mqttServerName: process.env.SEED_MQTT_SERVER_NAME || 'local-broker',
    mqttHost: process.env.SEED_MQTT_HOST || '127.0.0.1',
    mqttPort: parseInteger(process.env.SEED_MQTT_PORT, 1883),
    mqttTlsPort: parseInteger(process.env.SEED_MQTT_TLS_PORT, 8883),
    mqttWebsocketPort: parseInteger(process.env.SEED_MQTT_WEBSOCKET_PORT, 9001),
    mqttUseTls: parseBoolean(process.env.SEED_MQTT_USE_TLS, false),
    demoDeviceId: process.env.SEED_DEMO_DEVICE_ID || 'feeder001',
    demoMachineCode: process.env.SEED_DEMO_MACHINE_CODE || 'PF-ESP8266-001',
    demoPairingCode: process.env.SEED_DEMO_PAIRING_CODE || 'A8K2-91PQ',
    demoDeviceSecret: process.env.SEED_DEMO_DEVICE_SECRET || 'CHANGE_ME_DEVICE_SECRET',
    demoMqttUsername: process.env.SEED_DEMO_MQTT_USERNAME || 'feeder001',
    demoMqttPassword: process.env.SEED_DEMO_MQTT_PASSWORD || 'feeder001_dev_password'
  }
};
