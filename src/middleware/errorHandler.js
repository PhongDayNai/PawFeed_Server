import { env } from '../config/env.js';
import { ERROR_CODES } from '../utils/errorCodes.js';
import { errorResponse } from '../utils/response.js';
import { safeErrorLog } from '../utils/redact.js';

function normalizeError(error) {
  if (error?.type === 'entity.parse.failed') {
    return {
      statusCode: 400,
      code: ERROR_CODES.INVALID_JSON,
      message: 'Request body must be valid JSON.',
      details: undefined
    };
  }

  if (error?.type === 'entity.too.large' || error?.status === 413) {
    return {
      statusCode: 413,
      code: ERROR_CODES.PAYLOAD_TOO_LARGE,
      message: 'Request payload is too large.',
      details: undefined
    };
  }

  const statusCode = Number.isInteger(error?.statusCode)
    ? error.statusCode
    : Number.isInteger(error?.status)
      ? error.status
      : 500;

  return {
    statusCode,
    code: error?.code || (statusCode === 500 ? ERROR_CODES.INTERNAL_SERVER_ERROR : ERROR_CODES.REQUEST_ERROR),
    message: statusCode === 500 && env.isProduction
      ? 'Internal server error.'
      : error?.message || 'Internal server error.',
    details: error?.details
  };
}

export function errorHandler(error, req, res, _next) {
  const normalized = normalizeError(error);

  if (normalized.statusCode >= 500) {
    console.error('[server-error]', {
      requestId: req.id,
      code: normalized.code,
      path: req.originalUrl,
      method: req.method,
      error: safeErrorLog(error),
      stack: env.isProduction ? undefined : error?.stack
    });
  }

  return res.status(normalized.statusCode).json(
    errorResponse({
      code: normalized.code,
      message: normalized.message,
      details: env.isProduction && normalized.statusCode >= 500 ? undefined : normalized.details
    })
  );
}
