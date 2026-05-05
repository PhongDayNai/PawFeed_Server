import { handleStateMessage } from '../../services/mqttInbound.service.js';

export async function stateHandler(message) {
  return handleStateMessage({
    topicDeviceId: message.deviceId,
    payload: message.payload
  });
}
