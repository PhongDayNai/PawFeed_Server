import { sendCreated, sendSuccess } from '../utils/response.js';
import {
  createFeedNowCommand,
  getUserCommandStatus,
  listAdminCommands,
  listUserCommands
} from '../services/command.service.js';

function requestContext(req) {
  return {
    actorUserId: req.user?.id || null,
    clientIp: req.ip,
    userAgent: req.headers['user-agent'] || null
  };
}

export async function feedNow(req, res) {
  const result = await createFeedNowCommand(req.params.deviceId, req.user.id, req.body, requestContext(req));
  return sendCreated(res, result);
}

export async function getCommandStatus(req, res) {
  const command = await getUserCommandStatus(req.params.deviceId, req.user.id, req.params.requestId);
  return sendSuccess(res, { command });
}

export async function listCommands(req, res) {
  const result = await listUserCommands(req.params.deviceId, req.user.id, req.query);
  return sendSuccess(res, { commands: result.items }, 200, result.pagination);
}

export async function listAdminDeviceCommands(req, res) {
  const result = await listAdminCommands(req.query);
  return sendSuccess(res, { commands: result.items }, 200, result.pagination);
}
