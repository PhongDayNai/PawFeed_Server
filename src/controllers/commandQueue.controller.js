import { sendSuccess } from '../utils/response.js';
import { getUserQueue, removeUserFromQueue } from '../services/offlineQueue.service.js';

export async function listCommandQueue(req, res) {
  const { deviceId } = req.params;
  const items = await getUserQueue(deviceId, req.user.id);
  return sendSuccess(res, { items }, 200);
}

export async function removeFromCommandQueue(req, res) {
  const { deviceId, requestId } = req.params;
  await removeUserFromQueue(deviceId, req.user.id, requestId);
  return sendSuccess(res, { message: 'Command removed from queue' });
}