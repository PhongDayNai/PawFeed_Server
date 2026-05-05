import crypto from 'node:crypto';
import helmet from 'helmet';
import { env } from '../config/env.js';
import { badRequestError } from '../utils/errors.js';
import { ERROR_CODES } from '../utils/errorCodes.js';

const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function hasDangerousKey(value, depth = 0, seen = new WeakSet()) {
  if (depth > 30) return false;
  if (value === null || value === undefined || typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);

  for (const key of Object.keys(value)) {
    if (DANGEROUS_KEYS.has(key)) return true;
    if (hasDangerousKey(value[key], depth + 1, seen)) return true;
  }
  return false;
}

export function requestIdMiddleware(req, res, next) {
  const headerName = env.security.requestIdHeader.toLowerCase();
  const incoming = req.headers[headerName];
  const requestId = typeof incoming === 'string' && incoming.length <= 128
    ? incoming
    : crypto.randomUUID();

  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

export function prototypePollutionGuard(req, _res, next) {
  if (!env.security.rejectPrototypePollution) return next();

  if (hasDangerousKey(req.body) || hasDangerousKey(req.query) || hasDangerousKey(req.params)) {
    return next(badRequestError(
      'Request contains a reserved object key.',
      ERROR_CODES.RESERVED_OBJECT_KEY
    ));
  }

  return next();
}

export function requireHttpsMiddleware(req, res, next) {
  if (!env.security.requireHttps || req.secure || req.headers['x-forwarded-proto'] === 'https') {
    return next();
  }

  return res.status(403).json({
    ok: false,
    error: {
      code: ERROR_CODES.HTTPS_REQUIRED,
      message: 'HTTPS is required for this endpoint.'
    }
  });
}

export function createHelmetMiddleware() {
  return helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: env.isProduction
      ? {
          maxAge: env.security.hstsMaxAgeSec,
          includeSubDomains: true,
          preload: false
        }
      : false,
    referrerPolicy: { policy: 'no-referrer' }
  });
}

export function assertProductionSecurity() {
  if (!env.isProduction) return;

  const errors = [];
  if (env.auth.jwtAccessSecret === 'change_this_access_secret_in_production') {
    errors.push('JWT_ACCESS_SECRET must be changed in production.');
  }
  if (env.auth.jwtRefreshSecret === 'change_this_refresh_secret_in_production') {
    errors.push('JWT_REFRESH_SECRET must be changed in production.');
  }
  if (env.auth.jwtAccessSecret === env.auth.jwtRefreshSecret) {
    errors.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different in production.');
  }
  if (env.corsOrigin === '*') {
    errors.push('CORS_ORIGIN must not be * in production.');
  }
  if (env.db.allowReset) {
    errors.push('DB_ALLOW_RESET must be false in production.');
  }
  if (!env.security.requireHttps) {
    errors.push('REQUIRE_HTTPS should be true behind a production proxy/load balancer.');
  }

  if (errors.length) {
    throw new Error(`Production security check failed:\n- ${errors.join('\n- ')}`);
  }
}
