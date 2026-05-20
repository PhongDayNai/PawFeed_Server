import mqtt from 'mqtt';
import { env } from '../config/env.js';
import { AppError, ERROR_CODES } from '../utils/errors.js';
import { mqttRouter } from './mqttRouter.js';
import { registerDefaultMqttHandlers } from './handlers/index.js';

export const DEFAULT_MQTT_SUBSCRIPTIONS = Object.freeze([
  'feeder/+/online',
  'feeder/+/state',
  'feeder/+/telemetry',
  'feeder/+/event',
  'feeder/+/ack'
]);

// QoS levels per topic type as per Phase 4 spec
export const MQTT_QOS = Object.freeze({
  COMMANDS: 1,  // At least once - command must be received
  STATUS: 0,    // Fire-and-forget, retained message
  EVENTS: 0,    // Fire-and-forget
  ACK: 1        // At least once - ACK must be received
});

// Topic builders (feeder/{deviceId}/ format - what device firmware uses)
export const TOPICS = Object.freeze({
  COMMANDS: (deviceId) => `feeder/${deviceId}/cmd`,
  STATUS: (deviceId) => `feeder/${deviceId}/status`,
  EVENTS: (deviceId) => `feeder/${deviceId}/event`,
  ACK: (deviceId) => `feeder/${deviceId}/ack`
});

function hasText(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

export function buildMqttConnectionUrl(config = env.mqtt) {
  const protocol = config.useTls ? 'mqtts' : 'mqtt';
  return `${protocol}://${config.host}:${config.port}`;
}

export function buildMqttOptions(config = env.mqtt) {
  const options = {
    clientId: config.clientId,
    clean: true,
    keepalive: config.keepaliveSec,
    connectTimeout: config.connectTimeoutMs,
    reconnectPeriod: config.reconnectPeriodMs,
    queueQoSZero: false,
    protocolVersion: 4
  };

  if (hasText(config.username)) options.username = config.username;
  if (hasText(config.password)) options.password = config.password;

  if (config.useTls) {
    options.rejectUnauthorized = config.rejectUnauthorized;
  }

  return options;
}

export function maskMqttOptions(options) {
  return {
    ...options,
    password: options.password ? '***' : undefined
  };
}

export function buildDeviceCommandTopic(deviceId) {
  return `feeder/${deviceId}/cmd`;
}

export function buildDeviceStatusTopic(deviceId) {
  return `feeder/${deviceId}/status`;
}

export class MqttClientService {
  constructor({ config = env.mqtt, mqttModule = mqtt, router = mqttRouter, logger = console } = {}) {
    this.config = config;
    this.mqttModule = mqttModule;
    this.router = router;
    registerDefaultMqttHandlers(this.router);
    this.logger = logger;
    this.client = null;
    this.startedAt = null;
    this.connectedAt = null;
    this.lastError = null;
    this.subscribedTopics = [];
  }

  get enabled() {
    return Boolean(this.config.enabled);
  }

  get connected() {
    return Boolean(this.client?.connected);
  }

  start() {
    if (!this.enabled) {
      this.logger.info?.('[mqtt] disabled. Set MQTT_ENABLED=true to connect broker.');
      return null;
    }

    if (this.client) {
      return this.client;
    }

    const url = buildMqttConnectionUrl(this.config);
    const options = buildMqttOptions(this.config);
    this.startedAt = new Date();

    this.logger.info?.('[mqtt] connecting broker', {
      url,
      options: maskMqttOptions(options)
    });

    this.client = this.mqttModule.connect(url, options);
    this.attachEventHandlers();

    return this.client;
  }

  attachEventHandlers() {
    if (!this.client) return;

    this.client.on('connect', () => {
      this.connectedAt = new Date();
      this.lastError = null;
      this.logger.info?.('[mqtt] connected.');
      this.subscribeDefaultTopics();
    });

    this.client.on('reconnect', () => {
      this.logger.info?.('[mqtt] reconnecting...');
    });

    this.client.on('close', () => {
      this.logger.warn?.('[mqtt] connection closed.');
    });

    this.client.on('offline', () => {
      this.logger.warn?.('[mqtt] offline.');
    });

    this.client.on('error', (error) => {
      this.lastError = {
        message: error.message,
        at: new Date().toISOString()
      };
      this.logger.error?.('[mqtt] error:', error.message);
    });

    this.client.on('message', (topic, payload, packet) => {
      this.router.routeMessage(topic, payload, packet).catch((error) => {
        this.logger.error?.('[mqtt] message handler error:', error);
      });
    });
  }

  subscribeDefaultTopics() {
    if (!this.client) return;

    this.client.subscribe(DEFAULT_MQTT_SUBSCRIPTIONS, { qos: this.config.subscribeQos }, (error, granted = []) => {
      if (error) {
        this.lastError = {
          message: error.message,
          at: new Date().toISOString()
        };
        this.logger.error?.('[mqtt] subscribe failed:', error.message);
        return;
      }

      this.subscribedTopics = granted.map((item) => item.topic);
      this.logger.info?.('[mqtt] subscribed topics:', this.subscribedTopics);
    });
  }

  async publishCommand(deviceId, payload, options = {}) {
    if (!this.enabled) {
      throw new AppError('MQTT service is disabled.', 503, ERROR_CODES.MQTT_DISABLED);
    }

    if (!this.client) {
      throw new AppError('MQTT client has not been started.', 503, ERROR_CODES.MQTT_NOT_STARTED);
    }

    if (!this.connected) {
      throw new AppError('MQTT client is not connected.', 503, ERROR_CODES.MQTT_NOT_CONNECTED);
    }

    const topic = buildDeviceCommandTopic(deviceId);
    const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const publishOptions = {
      qos: options.qos ?? MQTT_QOS.COMMANDS,
      retain: options.retain ?? false
    };

    await new Promise((resolve, reject) => {
      this.client.publish(topic, message, publishOptions, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    this.logger.info?.(`[mqtt] published command to ${topic}`);
    return {
      ok: true,
      topic,
      payloadSize: Buffer.byteLength(message, 'utf8'),
      qos: publishOptions.qos,
      retain: publishOptions.retain
    };
  }

  async publishStatus(deviceId, payload, options = {}) {
    if (!this.enabled || !this.client || !this.connected) {
      return { ok: false, reason: 'not_connected' };
    }

    const topic = buildDeviceStatusTopic(deviceId);
    const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const publishOptions = {
      qos: options.qos ?? MQTT_QOS.STATUS,
      retain: options.retain ?? true  // Status messages are retained by default
    };

    await new Promise((resolve, reject) => {
      this.client.publish(topic, message, publishOptions, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    this.logger.info?.(`[mqtt] published status to ${topic} (retained: ${publishOptions.retain})`);
    return {
      ok: true,
      topic,
      payloadSize: Buffer.byteLength(message, 'utf8'),
      qos: publishOptions.qos,
      retain: publishOptions.retain
    };
  }

  async stop() {
    if (!this.client) return;

    const client = this.client;
    this.client = null;

    await new Promise((resolve) => {
      client.end(false, {}, () => resolve());
    });

    this.logger.info?.('[mqtt] stopped.');
  }

  getStatus() {
    return {
      enabled: this.enabled,
      connected: this.connected,
      host: this.config.host,
      port: this.config.port,
      useTls: this.config.useTls,
      clientId: this.config.clientId,
      startedAt: this.startedAt?.toISOString() || null,
      connectedAt: this.connectedAt?.toISOString() || null,
      subscribedTopics: this.subscribedTopics,
      lastError: this.lastError
    };
  }
}

export const mqttClientService = new MqttClientService();

export const __mqttClientInternals = {
  hasText
};
