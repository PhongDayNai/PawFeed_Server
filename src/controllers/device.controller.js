import { successResponse } from '../utils/response.js';
import {
  getUserDevice,
  getUserDeviceStatus,
  linkDeviceToUser,
  listUserDevices,
  unlinkUserDevice,
  updateUserDevice
} from '../services/device.service.js';

function requestContext(req) {
  return {
    actorUserId: req.user?.id || null,
    clientIp: req.ip,
    userAgent: req.headers['user-agent'] || null
  };
}

export async function linkDevice(req, res) {
  const result = await linkDeviceToUser(req.body, requestContext(req));
  return res.status(result.alreadyLinked ? 200 : 201).json(successResponse(result));
}

export async function listDevices(req, res) {
  const devices = await listUserDevices(req.user.id);
  return res.json(successResponse({ devices }));
}

export async function getDevice(req, res) {
  const device = await getUserDevice(req.params.deviceId, req.user.id);
  return res.json(successResponse({ device }));
}

export async function getDeviceStatus(req, res) {
  const status = await getUserDeviceStatus(req.params.deviceId, req.user.id);
  return res.json(successResponse(status));
}

export async function patchDevice(req, res) {
  const device = await updateUserDevice(req.params.deviceId, req.user.id, req.body, requestContext(req));
  return res.json(successResponse({ device }));
}

export async function unlinkDevice(req, res) {
  const result = await unlinkUserDevice(req.params.deviceId, req.user.id, requestContext(req));
  return res.json(successResponse(result));
}
