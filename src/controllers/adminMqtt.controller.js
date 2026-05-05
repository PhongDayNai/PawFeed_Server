import { sendCreated, sendPaginated, sendSuccess } from '../utils/response.js';
import {
  createMqttServer,
  getDeviceMqttCredential,
  getMqttServer,
  listDeviceMqttCredentials,
  listMqttServers,
  rotateDeviceMqttCredential,
  rotateDeviceSecret,
  testMqttServer,
  updateMqttServer
} from '../services/adminMqtt.service.js';

function requestContext(req) {
  return { actorUserId: req.user?.id || null, actorRole: req.user?.role || null, clientIp: req.ip, userAgent: req.headers['user-agent'] || null };
}

export async function getMqttServers(req, res) {
  const result = await listMqttServers(req.query);
  return sendPaginated(res, result.servers, result.meta, 'servers');
}

export async function postMqttServer(req, res) {
  const server = await createMqttServer(req.body, requestContext(req));
  return sendCreated(res, { server });
}

export async function getMqttServerDetail(req, res) {
  const server = await getMqttServer(req.params.id);
  return sendSuccess(res, { server });
}

export async function patchMqttServer(req, res) {
  const server = await updateMqttServer(req.params.id, req.body, requestContext(req));
  return sendSuccess(res, { server });
}

export async function postMqttServerTest(req, res) {
  const result = await testMqttServer(req.params.id, req.body || {}, requestContext(req));
  return sendSuccess(res, result);
}

export async function getDeviceMqttCredentialController(req, res) {
  const credential = await getDeviceMqttCredential(req.params.deviceId);
  return sendSuccess(res, { credential });
}

export async function listDeviceMqttCredentialsController(req, res) {
  const credentials = await listDeviceMqttCredentials(req.params.deviceId);
  return sendSuccess(res, { credentials });
}

export async function rotateDeviceMqttCredentialController(req, res) {
  const result = await rotateDeviceMqttCredential(req.params.deviceId, req.body, requestContext(req));
  return sendSuccess(res, result);
}

export async function rotateDeviceSecretController(req, res) {
  const result = await rotateDeviceSecret(req.params.deviceId, req.body, requestContext(req));
  return sendSuccess(res, result);
}
