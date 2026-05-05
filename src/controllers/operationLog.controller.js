import { sendSuccess } from '../utils/response.js';
import {
  getAdminConfigGeneration,
  listAdminConfigGenerations,
  listAdminDeviceEvents,
  listAdminFeedingHistories,
  listUserConfigGenerations,
  listUserDeviceEvents,
  listUserFeedingHistory,
  revokeAdminConfigGeneration
} from '../services/operationLog.service.js';

function requestContext(req) {
  return {
    clientIp: req.ip,
    userAgent: req.headers['user-agent'] || null
  };
}

export async function getUserDeviceEvents(req, res) {
  const result = await listUserDeviceEvents(req.params.deviceId, req.user.id, req.query);
  return sendSuccess(res, { events: result.items }, 200, result.pagination);
}

export async function getUserFeedingHistory(req, res) {
  const result = await listUserFeedingHistory(req.params.deviceId, req.user.id, req.query);
  return sendSuccess(res, { feedingHistory: result.items }, 200, result.pagination);
}

export async function getUserConfigGenerations(req, res) {
  const result = await listUserConfigGenerations(req.params.deviceId, req.user.id, req.query);
  return sendSuccess(res, { configGenerations: result.items }, 200, result.pagination);
}

export async function getAdminDeviceEvents(req, res) {
  const result = await listAdminDeviceEvents(req.query);
  return sendSuccess(res, { events: result.items }, 200, result.pagination);
}

export async function getAdminFeedingHistories(req, res) {
  const result = await listAdminFeedingHistories(req.query);
  return sendSuccess(res, { feedingHistories: result.items }, 200, result.pagination);
}

export async function getAdminConfigGenerations(req, res) {
  const result = await listAdminConfigGenerations(req.query);
  return sendSuccess(res, { configGenerations: result.items }, 200, result.pagination);
}

export async function getAdminConfigGenerationDetail(req, res) {
  const configGeneration = await getAdminConfigGeneration(req.params.configId);
  return sendSuccess(res, { configGeneration });
}

export async function revokeConfigGeneration(req, res) {
  const configGeneration = await revokeAdminConfigGeneration(req.params.configId, req.user.id, requestContext(req));
  return sendSuccess(res, { configGeneration });
}
