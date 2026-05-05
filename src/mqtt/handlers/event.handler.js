import { handleEventMessage } from '../../services/mqttInbound.service.js';

export async function eventHandler(message) {
  return handleEventMessage({
    topicDeviceId: message.deviceId,
    payload: message.payload
  });
}
