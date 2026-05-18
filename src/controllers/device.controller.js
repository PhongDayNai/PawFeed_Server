import { sendCreated, sendSuccess } from '../utils/response.js';
import {
  getUserDevice,
  getUserDeviceMqttStatus,
  getUserDeviceStatus,
  linkDeviceToUser,
  listUserDevices,
  unlinkUserDevice,
  updateUserDevice
} from '../services/device.service.js';

function requestContext(req) {
  return {
    actorUserId: req.user?.id || null,
    actorRole: req.user?.role || null,
    clientIp: req.ip,
    userAgent: req.headers['user-agent'] || null
  };
}

export async function linkDevice(req, res) {
  const result = await linkDeviceToUser(req.body, requestContext(req));
  if (result.alreadyLinked) {
    return sendSuccess(res, result);
  }
  return sendCreated(res, result);
}

export async function listDevices(req, res) {
  const result = await listUserDevices(req.user.id, req.query);
  return sendSuccess(res, { devices: result.items }, 200, result.pagination);
}

export async function getDevice(req, res) {
  const device = await getUserDevice(req.params.deviceId, req.user.id);
  return sendSuccess(res, { device });
}

export async function getDeviceStatus(req, res) {
  const status = await getUserDeviceStatus(req.params.deviceId, req.user.id);
  return sendSuccess(res, status);
}

export async function getMqttStatus(req, res) {
  const mqttStatus = await getUserDeviceMqttStatus(req.params.deviceId, req.user.id);
  return sendSuccess(res, mqttStatus);
}

export async function patchDevice(req, res) {
  const device = await updateUserDevice(req.params.deviceId, req.user.id, req.body, requestContext(req));
  return sendSuccess(res, { device });
}

export async function unlinkDevice(req, res) {
  const result = await unlinkUserDevice(req.params.deviceId, req.user.id, requestContext(req));
  return sendSuccess(res, result);
}
