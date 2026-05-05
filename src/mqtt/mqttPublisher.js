import { mqttClientService } from './mqttClient.js';

export async function publishCommand(deviceId, payload, options = {}) {
  return mqttClientService.publishCommand(deviceId, payload, options);
}

export async function publishFeedOnceCommand(deviceId, { requestId, openDurationMs }, options = {}) {
  return publishCommand(
    deviceId,
    {
      requestId,
      action: 'feed_once',
      openDurationMs
    },
    options
  );
}
