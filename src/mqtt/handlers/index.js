import { ackHandler } from './ack.handler.js';
import { eventHandler } from './event.handler.js';
import { onlineHandler } from './online.handler.js';
import { stateHandler } from './state.handler.js';
import { telemetryHandler } from './telemetry.handler.js';

export const DEFAULT_MQTT_HANDLERS = Object.freeze({
  online: onlineHandler,
  state: stateHandler,
  telemetry: telemetryHandler,
  event: eventHandler,
  ack: ackHandler
});

export function registerDefaultMqttHandlers(router) {
  for (const [type, handler] of Object.entries(DEFAULT_MQTT_HANDLERS)) {
    router.registerHandler(type, handler);
  }
  return router;
}

export { ackHandler, eventHandler, onlineHandler, stateHandler, telemetryHandler };
