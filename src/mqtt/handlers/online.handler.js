import { handleOnlineMessage } from '../../services/mqttInbound.service.js';

export async function onlineHandler(message) {
  return handleOnlineMessage({
    topicDeviceId: message.deviceId,
    payload: message.payload
  });
}
