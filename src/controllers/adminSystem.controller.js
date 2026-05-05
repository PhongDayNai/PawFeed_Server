import { listSystemSettings, patchSystemSettings } from '../services/adminSystem.service.js';
import { exportAuditLogsCsv, listAuditLogs } from '../services/audit.service.js';
import { sendPaginated, sendSuccess } from '../utils/response.js';

function requestContext(req) {
  return {
    actorUserId: req.user?.id || null,
    actorRole: req.user?.role || null,
    clientIp: req.ip,
    userAgent: req.headers['user-agent'] || null
  };
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

export async function exportAuditLogs(req, res) {
  if (req.query.format === 'json') {
    const result = await listAuditLogs({ ...req.query, page: 1, limit: req.query.limit });
    return sendSuccess(res, {
      logs: result.logs,
      exportedCount: result.logs.length,
      totalMatched: result.meta.total
    });
  }

  const result = await exportAuditLogsCsv(req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
  res.setHeader('X-Exported-Count', String(result.exportedCount));
  res.setHeader('X-Total-Matched', String(result.totalMatched));
  return res.status(200).send(result.csv);
}
