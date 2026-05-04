import { successResponse } from '../utils/response.js';
import {
  changeUserPassword,
  loginUser,
  refreshAuthTokens,
  registerUser
} from '../services/auth.service.js';

export async function register(req, res) {
  const result = await registerUser(req.body);
  return res.status(201).json(successResponse(result));
}

export async function login(req, res) {
  const result = await loginUser(req.body);
  return res.json(successResponse(result));
}

export async function me(req, res) {
  return res.json(successResponse({ user: req.user }));
}

export async function refresh(req, res) {
  const result = await refreshAuthTokens(req.body.refreshToken);
  return res.json(successResponse(result));
}

export async function changePassword(req, res) {
  const user = await changeUserPassword(req.user.id, req.body);
  return res.json(
    successResponse({
      user,
      message: 'Password changed successfully.'
    })
  );
}

export async function logout(_req, res) {
  return res.json(
    successResponse({
      message: 'Logout accepted. Delete accessToken and refreshToken on the client.'
    })
  );
}
