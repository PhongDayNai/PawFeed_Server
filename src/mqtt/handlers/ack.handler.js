import { handleAckMessage } from '../../services/mqttInbound.service.js';

export async function ackHandler(message) {
  return handleAckMessage({
    topicDeviceId: message.deviceId,
    payload: message.payload
  });
}
