import { sendCreated, sendSuccess } from '../utils/response.js';
import {
  changeUserPassword,
  loginUser,
  refreshAuthTokens,
  registerUser
} from '../services/auth.service.js';

export async function register(req, res) {
  const result = await registerUser(req.body);
  return sendCreated(res, result);
}

export async function login(req, res) {
  const result = await loginUser(req.body, req);
  return sendSuccess(res, result);
}

export async function me(req, res) {
  return sendSuccess(res, { user: req.user });
}

export async function refresh(req, res) {
  const result = await refreshAuthTokens(req.body.refreshToken);
  return sendSuccess(res, result);
}

export async function changePassword(req, res) {
  const user = await changeUserPassword(req.user.id, req.body);
  return sendSuccess(res, {
    user,
    message: 'Password changed successfully.'
  });
}

export async function logout(_req, res) {
  return sendSuccess(res, {
    message: 'Logout accepted. Delete accessToken and refreshToken on the client.'
  });
}
