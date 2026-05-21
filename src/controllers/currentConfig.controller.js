import { sendSuccess } from '../utils/response.js';
import {
  getDeviceCurrentConfig,
  getDeviceSchedule,
  getDeviceScheduleApplyStatus,
  saveDeviceCurrentConfig,
  saveDeviceSchedule
} from '../services/currentConfig.service.js';
import { notFoundError, conflictError } from '../utils/errors.js';

function requestContext(req) {
  return {
    actorUserId: req.user?.id || null,
    actorRole: req.user?.role || null,
    clientIp: req.ip,
    userAgent: req.headers['user-agent'] || null
  };
}

export async function getCurrentConfig(req, res) {
  const currentConfig = await getDeviceCurrentConfig(req.params.deviceId, req.user.id);
  // Set ETag header using version (latestConfigVersion)
  const version = currentConfig.version ?? 0;
  res.set('ETag', `"${version}"`);
  return sendSuccess(res, currentConfig);
}

export async function putCurrentConfig(req, res) {
  const deviceId = req.params.deviceId;
  const userId = req.user.id;

  // Validate If-Match header if present
  const ifMatch = req.headers['if-match'];
  if (ifMatch) {
    const currentConfig = await getDeviceCurrentConfig(deviceId, userId);
    const currentVersion = currentConfig.version ?? 0;
    const matchVersion = parseInt(ifMatch.replace(/"/g, ''), 10);
    if (!isNaN(matchVersion) && matchVersion !== currentVersion) {
      throw conflictError('Resource was modified.', 'VERSION_CONFLICT', {
        currentVersion,
        yourVersion: matchVersion
      });
    }
  }

  const currentConfig = await saveDeviceCurrentConfig(
    deviceId,
    userId,
    req.body,
    requestContext(req)
  );
  // Set ETag header for new version
  res.set('ETag', `"${currentConfig.version ?? 0}"`);
  return sendSuccess(res, currentConfig);
}

export async function getSchedule(req, res) {
  const schedule = await getDeviceSchedule(req.params.deviceId, req.user.id);
  // Add ETag header
  const version = schedule.version || 1;
  res.set('ETag', `"${version}"`);
  return sendSuccess(res, schedule);
}

export async function putSchedule(req, res) {
  const deviceId = req.params.deviceId;
  const userId = req.user.id;

  // Get current schedule for version check
  const currentSchedule = await getDeviceSchedule(deviceId, userId);
  const currentVersion = currentSchedule.version || 1;

  // Validate If-Match header if present
  const ifMatch = req.headers['if-match'];
  if (ifMatch) {
    // Parse version from If-Match header (format: "123")
    const matchVersion = parseInt(ifMatch.replace(/"/g, ''), 10);
    if (!isNaN(matchVersion) && matchVersion !== currentVersion) {
      throw conflictError('Resource was modified.', 'VERSION_CONFLICT', {
        currentVersion,
        yourVersion: matchVersion
      });
    }
  }

  // Save with the current version (service will increment it)
  const schedule = await saveDeviceSchedule(deviceId, userId, req.body, requestContext(req));

  // Set ETag header for the new version
  res.set('ETag', `"${schedule.version}"`);
  return sendSuccess(res, schedule);
}

export async function getScheduleApplyStatus(req, res) {
  const applyStatus = await getDeviceScheduleApplyStatus(req.params.deviceId, req.user.id);
  return sendSuccess(res, applyStatus);
}
