import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { unauthorizedError } from './errors.js';

function generateJti() {
  return crypto.randomUUID();
}

function signToken(payload, secret, expiresIn) {
  return jwt.sign(payload, secret, {
    expiresIn,
    issuer: env.appName,
    audience: 'pet-feeder-client'
  });
}

function verifyToken(token, secret, expectedType) {
  try {
    const payload = jwt.verify(token, secret, {
      issuer: env.appName,
      audience: 'pet-feeder-client'
    });

    if (payload.type !== expectedType) {
      throw unauthorizedError('Invalid token type.', 'INVALID_TOKEN_TYPE');
    }

    return payload;
  } catch (error) {
    if (error.statusCode) throw error;
    throw unauthorizedError('Invalid or expired token.', 'INVALID_TOKEN');
  }
}

export function createAccessToken(user) {
  return signToken(
    {
      type: 'access',
      sub: String(user.id),
      email: user.email,
      role: user.role
    },
    env.auth.jwtAccessSecret,
    env.auth.jwtAccessExpiresIn
  );
}

export function createRefreshToken(user) {
  const jti = generateJti();
  return {
    token: signToken(
      {
        type: 'refresh',
        sub: String(user.id),
        email: user.email,
        role: user.role,
        jti
      },
      env.auth.jwtRefreshSecret,
      env.auth.jwtRefreshExpiresIn
    ),
    jti
  };
}

export function verifyAccessToken(token) {
  return verifyToken(token, env.auth.jwtAccessSecret, 'access');
}

export function verifyRefreshToken(token) {
  return verifyToken(token, env.auth.jwtRefreshSecret, 'refresh');
}
