import mqtt from 'mqtt';
import { env } from '../config/env.js';
import { AppError, ERROR_CODES } from '../utils/errors.js';
import { buildMqttConnectionUrl } from '../mqtt/mqttClient.js';

function hasText(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function safeMessage(error) {
  return error?.message || String(error || 'MQTT connection failed.');
}

function normalizePort(server) {
  if (server.useTls) return Number(server.tlsPort || server.tls_port || server.mqttPort || server.mqtt_port || 8883);
  return Number(server.mqttPort || server.mqtt_port || server.tlsPort || server.tls_port || 1883);
}

export function buildMqttAdminTestConfig(server, input = {}) {
  const useTls = input.useTls ?? Boolean(Number(server.use_tls ?? server.useTls ?? false));
  const config = {
    enabled: true,
    host: input.host || server.host,
    port: Number(input.port || normalizePort({ ...server, useTls })),
    useTls,
    username: input.username ?? '',
    password: input.password ?? '',
    clientId: input.clientId || `${env.mqtt.adminTestClientIdPrefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    keepaliveSec: input.keepaliveSec ?? env.mqtt.keepaliveSec,
    connectTimeoutMs: input.timeoutMs ?? env.mqtt.adminTestTimeoutMs,
    reconnectPeriodMs: 0,
    rejectUnauthorized: input.rejectUnauthorized ?? env.mqtt.rejectUnauthorized
  };

  if (input.useServiceCredentials) {
    config.username = env.mqtt.username;
    config.password = env.mqtt.password;
  } else if (!hasText(config.username) && hasText(env.mqtt.username)) {
    config.username = env.mqtt.username;
    config.password = env.mqtt.password;
  }

  return config;
}

export async function testMqttConnectivity(config, { mqttModule = mqtt } = {}) {
  const startedAt = Date.now();
  const url = buildMqttConnectionUrl(config);
  const options = {
    clientId: config.clientId,
    clean: true,
    keepalive: config.keepaliveSec,
    connectTimeout: config.connectTimeoutMs,
    reconnectPeriod: 0,
    queueQoSZero: false,
    protocolVersion: 4
  };

  if (hasText(config.username)) options.username = config.username;
  if (hasText(config.password)) options.password = config.password;
  if (config.useTls) options.rejectUnauthorized = config.rejectUnauthorized;

  let client;

  try {
    await new Promise((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error(`MQTT connection timed out after ${config.connectTimeoutMs} ms.`));
      }, config.connectTimeoutMs + 250);

      const finish = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (error) reject(error);
        else resolve();
      };

      client = mqttModule.connect(url, options);
      client.once('connect', () => finish());
      client.once('error', (error) => finish(error));
      client.once('close', () => {
        if (!settled) finish(new Error('MQTT connection closed before connect.'));
      });
    });

    const responseTimeMs = Date.now() - startedAt;
    await new Promise((resolve) => client.end(false, {}, resolve));

    return {
      ok: true,
      host: config.host,
      port: config.port,
      useTls: Boolean(config.useTls),
      clientId: config.clientId,
      usedUsername: hasText(config.username),
      responseTimeMs,
      message: 'MQTT connection successful.'
    };
  } catch (error) {
    if (client) {
      try { client.end(true); } catch (_) { /* ignore cleanup errors */ }
    }
    throw new AppError('MQTT connection test failed.', 503, ERROR_CODES.MQTT_CONNECTION_TEST_FAILED, {
      host: config.host,
      port: config.port,
      useTls: Boolean(config.useTls),
      message: safeMessage(error)
    });
  }
}

export const __mqttConnectionTestInternals = { hasText, normalizePort };
