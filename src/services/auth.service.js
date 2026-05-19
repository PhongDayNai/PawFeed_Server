import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import {
  badRequestError,
  conflictError,
  forbiddenError,
  unauthorizedError
} from '../utils/errors.js';
import { normalizeEmail, toPublicUser } from '../utils/user.js';
import {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken
} from '../utils/token.js';
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserPassword
} from './user.service.js';
import { recordFailedLoginAttempt, clearFailedLoginAttempts } from '../middleware/bruteForceProtection.js';

const allowedRoles = new Set(['user', 'admin', 'technician']);

export async function hashPassword(password) {
  return bcrypt.hash(password, env.auth.bcryptSaltRounds);
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

function assertUserCanLogin(user) {
  if (!user) {
    throw unauthorizedError('Email or password is incorrect.', 'INVALID_CREDENTIALS');
  }

  if (user.is_disabled) {
    throw forbiddenError('This account is disabled.', 'ACCOUNT_DISABLED');
  }
}

export function createAuthPayload(user) {
  const publicUser = toPublicUser(user);
  return {
    user: publicUser,
    tokenType: 'Bearer',
    accessToken: createAccessToken(publicUser),
    refreshToken: createRefreshToken(publicUser),
    accessTokenExpiresIn: env.auth.jwtAccessExpiresIn,
    refreshTokenExpiresIn: env.auth.jwtRefreshExpiresIn
  };
}

export async function registerUser({ fullName = null, email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const existingUser = await findUserByEmail(normalizedEmail);

  if (existingUser) {
    throw conflictError('Email is already registered.', 'EMAIL_ALREADY_REGISTERED');
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser({
    fullName,
    email: normalizedEmail,
    passwordHash,
    role: 'user'
  });

  return createAuthPayload(user);
}

export async function loginUser({ email, password }, req) {
  const user = await findUserByEmail(email);
  assertUserCanLogin(user);

  const passwordOk = await verifyPassword(password, user.password_hash);
  if (!passwordOk) {
    if (req) recordFailedLoginAttempt(req);
    throw unauthorizedError('Email or password is incorrect.', 'INVALID_CREDENTIALS');
  }

  if (req) clearFailedLoginAttempts(req);
  return createAuthPayload(user);
}

export async function refreshAuthTokens(refreshToken) {
  const payload = verifyRefreshToken(refreshToken);
  const user = await findUserById(payload.sub);
  assertUserCanLogin(user);

  return createAuthPayload(user);
}

export async function changeUserPassword(userId, { currentPassword, newPassword }) {
  const user = await findUserById(userId);
  assertUserCanLogin(user);

  const passwordOk = await verifyPassword(currentPassword, user.password_hash);
  if (!passwordOk) {
    throw unauthorizedError('Current password is incorrect.', 'INVALID_CURRENT_PASSWORD');
  }

  const samePassword = await verifyPassword(newPassword, user.password_hash);
  if (samePassword) {
    throw badRequestError('New password must be different from current password.', 'PASSWORD_NOT_CHANGED');
  }

  const passwordHash = await hashPassword(newPassword);
  const updatedUser = await updateUserPassword(user.id, passwordHash);
  return toPublicUser(updatedUser);
}

export function assertAllowedRole(role) {
  if (!allowedRoles.has(role)) {
    throw badRequestError('Invalid role.', 'INVALID_ROLE');
  }
}
