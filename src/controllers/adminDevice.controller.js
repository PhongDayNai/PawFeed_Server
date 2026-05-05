import { successResponse } from '../utils/response.js';
import {
  createAdminDevice,
  getAdminDevice,
  getAdminDeviceQr,
  getPairingCodeStatus,
  listAdminDevices,
  rotatePairingCode
} from '../services/adminDevice.service.js';

function requestContext(req) {
  return {
    actorUserId: req.user?.id || null,
    clientIp: req.ip,
    userAgent: req.headers['user-agent'] || null
  };
}

export async function createDevice(req, res) {
  const device = await createAdminDevice(req.body, requestContext(req));
  return res.status(201).json(successResponse({ device }));
}

export async function listDevices(req, res) {
  const result = await listAdminDevices(req.query);
  return res.json(successResponse({ devices: result.devices }, result.meta));
}

export async function getDevice(req, res) {
  const device = await getAdminDevice(req.params.deviceId);
  return res.json(successResponse({ device }));
}

export async function getDeviceQr(req, res) {
  const result = await getAdminDeviceQr(req.params.deviceId);
  return res.json(successResponse(result));
}

export async function getDevicePairingStatus(req, res) {
  const result = await getPairingCodeStatus(req.params.deviceId);
  return res.json(successResponse(result));
}

export async function rotateDevicePairingCode(req, res) {
  const result = await rotatePairingCode(req.params.deviceId, requestContext(req));
  return res.json(successResponse(result));
}
