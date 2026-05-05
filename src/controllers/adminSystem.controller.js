import { listAuditLogs, listSystemSettings, patchSystemSettings } from '../services/adminSystem.service.js';
import { sendPaginated, sendSuccess } from '../utils/response.js';

function requestContext(req) {
  return { actorUserId: req.user?.id || null, clientIp: req.ip, userAgent: req.headers['user-agent'] || null };
}

export async function getSystemSettings(req, res) {
  const result = await listSystemSettings();
  return sendSuccess(res, result);
}

export async function updateSystemSettings(req, res) {
  const result = await patchSystemSettings(req.body, requestContext(req));
  return sendSuccess(res, result);
}

export async function getAuditLogs(req, res) {
  const result = await listAuditLogs(req.query);
  return sendPaginated(res, result.logs, result.meta, 'logs');
}
