import { sendPaginated, sendSuccess } from '../utils/response.js';
import {
  disableAdminUser,
  enableAdminUser,
  getAdminUser,
  listAdminUsers,
  resetAdminUserPassword,
  updateAdminUser
} from '../services/adminUser.service.js';

function requestContext(req) {
  return {
    actorUserId: req.user?.id || null,
    clientIp: req.ip,
    userAgent: req.headers['user-agent'] || null
  };
}

export async function listUsers(req, res) {
  const result = await listAdminUsers(req.query);
  return sendPaginated(res, result.users, result.meta, 'users');
}

export async function getUser(req, res) {
  const user = await getAdminUser(req.params.userId);
  return sendSuccess(res, { user });
}

export async function updateUser(req, res) {
  const user = await updateAdminUser(req.params.userId, req.body, requestContext(req));
  return sendSuccess(res, { user });
}

export async function disableUser(req, res) {
  const user = await disableAdminUser(req.params.userId, requestContext(req));
  return sendSuccess(res, { user });
}

export async function enableUser(req, res) {
  const user = await enableAdminUser(req.params.userId, requestContext(req));
  return sendSuccess(res, { user });
}

export async function resetUserPassword(req, res) {
  const result = await resetAdminUserPassword(req.params.userId, req.body, requestContext(req));
  return sendSuccess(res, result);
}
