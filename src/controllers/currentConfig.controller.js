import { sendSuccess } from '../utils/response.js';
import {
  getDeviceCurrentConfig,
  getDeviceSchedule,
  getDeviceScheduleApplyStatus,
  saveDeviceCurrentConfig,
  saveDeviceSchedule
} from '../services/currentConfig.service.js';

function requestContext(req) {
  return {
    actorUserId: req.user?.id || null,
    clientIp: req.ip,
    userAgent: req.headers['user-agent'] || null
  };
}

export async function getCurrentConfig(req, res) {
  const currentConfig = await getDeviceCurrentConfig(req.params.deviceId, req.user.id);
  return sendSuccess(res, currentConfig);
}

export async function putCurrentConfig(req, res) {
  const currentConfig = await saveDeviceCurrentConfig(
    req.params.deviceId,
    req.user.id,
    req.body,
    requestContext(req)
  );
  return sendSuccess(res, currentConfig);
}

export async function getSchedule(req, res) {
  const schedule = await getDeviceSchedule(req.params.deviceId, req.user.id);
  return sendSuccess(res, schedule);
}

export async function putSchedule(req, res) {
  const schedule = await saveDeviceSchedule(req.params.deviceId, req.user.id, req.body, requestContext(req));
  return sendSuccess(res, schedule);
}

export async function getScheduleApplyStatus(req, res) {
  const applyStatus = await getDeviceScheduleApplyStatus(req.params.deviceId, req.user.id);
  return sendSuccess(res, applyStatus);
}
