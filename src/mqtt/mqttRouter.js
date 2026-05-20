const DEVICE_TOPIC_PATTERN = /^feeder\/([^/]+)\/(online|state|telemetry|event|ack)$/;

function bufferToString(payload) {
  if (Buffer.isBuffer(payload)) return payload.toString('utf8');
  if (payload === undefined || payload === null) return '';
  return String(payload);
}

function parseJsonPayload(payload) {
  const raw = bufferToString(payload).trim();
  if (!raw) return { raw: '', json: null, parseError: null };

  try {
    return { raw, json: JSON.parse(raw), parseError: null };
  } catch (error) {
    return { raw, json: null, parseError: error };
  }
}

function maskSensitiveFields(value) {
  if (!value || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map((item) => maskSensitiveFields(item));
  }

  const masked = {};
  for (const [key, item] of Object.entries(value)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('password') ||
      lowerKey.includes('pass') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('claimcode') ||
      lowerKey.includes('pairingcode')
    ) {
      masked[key] = item ? '***' : item;
    } else if (item && typeof item === 'object') {
      masked[key] = maskSensitiveFields(item);
    } else {
      masked[key] = item;
    }
  }
  return masked;
}

export function parseFeederTopic(topic) {
  const match = DEVICE_TOPIC_PATTERN.exec(topic);
  if (match) {
    return {
      topic,
      deviceId: match[1],
      type: match[2],
      version: 1
    };
  }

  return null;
}

export class MqttRouter {
  constructor({ logger = console } = {}) {
    this.logger = logger;
    this.handlers = new Map();
  }

  registerHandler(type, handler) {
    if (!type || typeof handler !== 'function') {
      throw new Error('registerHandler requires a topic type and handler function.');
    }

    this.handlers.set(type, handler);
  }

  clearHandlers() {
    this.handlers.clear();
  }

  async routeMessage(topic, payload, packet = undefined) {
    const parsedTopic = parseFeederTopic(topic);
    if (!parsedTopic) {
      this.logger.warn?.(`[mqtt] ignored unsupported topic: ${topic}`);
      return {
        ok: false,
        ignored: true,
        reason: 'unsupported_topic',
        topic
      };
    }

    const parsedPayload = parseJsonPayload(payload);
    if (parsedPayload.parseError) {
      this.logger.warn?.(
        `[mqtt] ignored invalid JSON from ${parsedTopic.deviceId}/${parsedTopic.type}: ${parsedPayload.parseError.message}`
      );
      return {
        ok: false,
        ignored: true,
        reason: 'invalid_json',
        topic,
        deviceId: parsedTopic.deviceId,
        type: parsedTopic.type
      };
    }

    const message = {
      ...parsedTopic,
      payload: parsedPayload.json,
      rawPayload: parsedPayload.raw,
      packet
    };

    const handler = this.handlers.get(parsedTopic.type);
    if (handler) {
      await handler(message);
      return { ok: true, handled: true, ...parsedTopic };
    }

    this.logger.info?.(
      `[mqtt] received ${parsedTopic.type} from ${parsedTopic.deviceId}; handler will be implemented in Phase 10.`,
      maskSensitiveFields(parsedPayload.json)
    );

    return {
      ok: true,
      handled: false,
      ...parsedTopic
    };
  }
}

export const mqttRouter = new MqttRouter();

export const __mqttRouterInternals = {
  DEVICE_TOPIC_PATTERN,
  parseJsonPayload,
  maskSensitiveFields
};
