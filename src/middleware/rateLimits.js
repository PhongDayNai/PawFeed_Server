import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { errorResponse } from '../utils/response.js';

function rateLimitHandler(_req, res) {
  res.status(429).json(
    errorResponse({
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.'
    })
  );
}

function createLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json(
        errorResponse({
          code: 'RATE_LIMIT_EXCEEDED',
          message
        })
      );
    }
  });
}

export const apiRateLimiter = createLimiter({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  message: 'Too many requests. Please try again later.'
});

export const authRateLimiter = createLimiter({
  windowMs: env.security.authRateLimitWindowMs,
  max: env.security.authRateLimitMax,
  message: 'Too many authentication requests. Please try again later.'
});

export const linkDeviceRateLimiter = createLimiter({
  windowMs: env.security.linkDeviceRateLimitWindowMs,
  max: env.security.linkDeviceRateLimitMax,
  message: 'Too many device linking attempts. Please try again later.'
});

export const feedNowRateLimiter = createLimiter({
  windowMs: env.security.feedNowRateLimitWindowMs,
  max: env.security.feedNowRateLimitMax,
  message: 'Too many feed-now requests. Please slow down.'
});

export const configGenerationRateLimiter = createLimiter({
  windowMs: env.security.configGenerationRateLimitWindowMs,
  max: env.security.configGenerationRateLimitMax,
  message: 'Too many config generation requests. Please try again later.'
});

export const adminSensitiveRateLimiter = createLimiter({
  windowMs: env.security.adminSensitiveRateLimitWindowMs,
  max: env.security.adminSensitiveRateLimitMax,
  message: 'Too many sensitive admin actions. Please try again later.'
});

export { rateLimitHandler };
