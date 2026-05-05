import { sendSuccess } from '../utils/response.js';
import {
  generateConfigFile,
  listConfigGenerations,
  regenerateConfigFile
} from '../services/configFile.service.js';

function requestContext(req) {
  return {
    actorUserId: req.user?.id || null,
    clientIp: req.ip,
    userAgent: req.headers['user-agent'] || null
  };
}

function sendConfigDownload(res, result) {
  return res
    .status(200)
    .set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${result.fileName}"`,
      'X-Config-Id': result.configId,
      'X-Config-Version': String(result.configVersion),
      'X-Config-Expires-At': String(result.expiresAt),
      'Content-Length': String(result.contentLength)
    })
    .send(Buffer.from(result.content, 'utf8'));
}

function toJsonModeResponse(result) {
  return {
    fileName: result.fileName,
    configId: result.configId,
    configVersion: result.configVersion,
    issuedAt: result.issuedAt,
    expiresAt: result.expiresAt,
    content: result.content
  };
}

export async function createConfigFile(req, res) {
  const result = await generateConfigFile(req.params.deviceId, req.user.id, req.body, requestContext(req));

  if (req.query.mode === 'json') {
    return sendSuccess(res, toJsonModeResponse(result));
  }

  return sendConfigDownload(res, result);
}

export async function regenerateConfigFileController(req, res) {
  const result = await regenerateConfigFile(req.params.deviceId, req.user.id, requestContext(req));

  if (req.query.mode === 'json') {
    return sendSuccess(res, toJsonModeResponse(result));
  }

  return sendConfigDownload(res, result);
}

export async function getConfigGenerations(req, res) {
  const result = await listConfigGenerations(req.params.deviceId, req.user.id, req.query);
  return sendSuccess(res, { configGenerations: result.items }, 200, result.pagination);
}
