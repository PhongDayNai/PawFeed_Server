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
  isProduction: process.env.NODE_ENV === 'production'
};
