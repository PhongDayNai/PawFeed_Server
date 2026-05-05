import { handleTelemetryMessage } from '../../services/mqttInbound.service.js';

export async function telemetryHandler(message) {
  return handleTelemetryMessage({
    topicDeviceId: message.deviceId,
    payload: message.payload
  });
}
