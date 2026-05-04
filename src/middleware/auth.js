import { findUserById, toPublicUser } from '../services/user.service.js';
import { unauthorizedError, forbiddenError } from '../utils/errors.js';
import { verifyAccessToken } from '../utils/token.js';

function extractBearerToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token.trim();
}

export async function authenticate(req, _res, next) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      throw unauthorizedError('Bearer token is required.', 'MISSING_BEARER_TOKEN');
    }

    const payload = verifyAccessToken(token);
    const user = await findUserById(payload.sub);

    if (!user) {
      throw unauthorizedError('Authenticated user was not found.', 'USER_NOT_FOUND');
    }

    if (user.is_disabled) {
      throw forbiddenError('This account is disabled.', 'ACCOUNT_DISABLED');
    }

    req.auth = {
      tokenPayload: payload,
      userId: Number(user.id),
      role: user.role
    };
    req.user = toPublicUser(user);

    next();
  } catch (error) {
    next(error);
  }
}
