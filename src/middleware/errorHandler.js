import { env } from '../config/env.js';
import { errorResponse } from '../utils/response.js';

export function errorHandler(error, req, res, _next) {
  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  const code = error.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR');
  const message = statusCode === 500 && env.isProduction
    ? 'Internal server error.'
    : error.message || 'Internal server error.';

  if (statusCode >= 500) {
    console.error('[server-error]', {
      code,
      message: error.message,
      path: req.originalUrl,
      method: req.method,
      stack: env.isProduction ? undefined : error.stack
    });
  }

  res.status(statusCode).json(
    errorResponse({
      code,
      message,
      details: error.details
    })
  );
}
