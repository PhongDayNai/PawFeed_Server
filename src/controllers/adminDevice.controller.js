import { sendCreated, sendPaginated, sendSuccess } from '../utils/response.js';
import {
  createAdminDevice,
  deleteAdminDevice,
  disableAdminDevice,
  enableAdminDevice,
  getAdminDevice,
  getAdminDeviceQr,
  getPairingCodeStatus,
  listAdminDeviceLinkAttempts,
  listAdminDevices,
  revokeAdminDevice,
  rotatePairingCode,
  transferAdminDeviceOwner,
  unlinkAdminDevice,
  updateAdminDevice
} from '../services/adminDevice.service.js';

function requestContext(req) {
  return {
    actorUserId: req.user?.id || null,
    actorRole: req.user?.role || null,
    clientIp: req.ip,
    userAgent: req.headers['user-agent'] || null
  };
}

export async function createDevice(req, res) {
  const device = await createAdminDevice(req.body, requestContext(req));
  return sendCreated(res, { device });
}

export async function deleteDevice(req, res) {
  const result = await deleteAdminDevice(req.params.deviceId, requestContext(req));
  return sendSuccess(res, result);
}

export async function listDevices(req, res) {
  const result = await listAdminDevices(req.query);
  return sendPaginated(res, result.devices, result.meta, 'devices');
}

export async function getDevice(req, res) {
  const device = await getAdminDevice(req.params.deviceId);
  return sendSuccess(res, { device });
}

export async function updateDevice(req, res) {
  const device = await updateAdminDevice(req.params.deviceId, req.body, requestContext(req));
  return sendSuccess(res, { device });
}

export async function disableDevice(req, res) {
  const device = await disableAdminDevice(req.params.deviceId, requestContext(req));
  return sendSuccess(res, { device });
}

export async function enableDevice(req, res) {
  const device = await enableAdminDevice(req.params.deviceId, requestContext(req));
  return sendSuccess(res, { device });
}

export async function revokeDevice(req, res) {
  const device = await revokeAdminDevice(req.params.deviceId, requestContext(req));
  return sendSuccess(res, { device });
}

export async function unlinkDevice(req, res) {
  const device = await unlinkAdminDevice(req.params.deviceId, requestContext(req));
  return sendSuccess(res, { device });
}

export async function transferDeviceOwner(req, res) {
  const device = await transferAdminDeviceOwner(req.params.deviceId, req.body, requestContext(req));
  return sendSuccess(res, { device });
}

export async function getDeviceQr(req, res) {
  const result = await getAdminDeviceQr(req.params.deviceId);
  return sendSuccess(res, result);
}

export async function getDevicePairingStatus(req, res) {
  const result = await getPairingCodeStatus(req.params.deviceId);
  return sendSuccess(res, result);
}

export async function rotateDevicePairingCode(req, res) {
  const result = await rotatePairingCode(req.params.deviceId, requestContext(req));
  return sendSuccess(res, result);
}

export async function getDeviceLinkAttempts(req, res) {
  const result = await listAdminDeviceLinkAttempts(req.params.deviceId, req.query);
  return sendPaginated(res, result.attempts, result.meta, 'attempts');
}
