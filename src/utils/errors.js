import { ERROR_CODES, validationCodeForSource } from './errorCodes.js';

export class AppError extends Error {
  constructor(message, statusCode = 500, code = ERROR_CODES.INTERNAL_SERVER_ERROR, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export function badRequestError(message = 'Bad request.', code = ERROR_CODES.BAD_REQUEST, details = undefined) {
  return new AppError(message, 400, code, details);
}

export function unauthorizedError(message = 'Authentication is required.', code = ERROR_CODES.UNAUTHORIZED, details = undefined) {
  return new AppError(message, 401, code, details);
}

export function forbiddenError(
  message = 'You do not have permission to access this resource.',
  code = ERROR_CODES.FORBIDDEN,
  details = undefined
) {
  return new AppError(message, 403, code, details);
}

export function notFoundError(message = 'Route not found.', code = ERROR_CODES.ROUTE_NOT_FOUND, details = undefined) {
  return new AppError(message, 404, code, details);
}

export function conflictError(message = 'Resource conflict.', code = ERROR_CODES.CONFLICT, details = undefined) {
  return new AppError(message, 409, code, details);
}

export function validationError(details, options = {}) {
  const source = options.source;
  const message = options.message || validationMessageForSource(source);
  const code = options.code || validationCodeForSource(source);
  return new AppError(message, 400, code, details);
}

export function validationMessageForSource(source) {
  if (source === 'body') return 'Request body validation failed.';
  if (source === 'query') return 'Request query validation failed.';
  if (source === 'params') return 'Request params validation failed.';
  return 'Validation failed.';
}

export function deviceAccessDeniedError() {
  return forbiddenError('You do not have permission to access this device.', ERROR_CODES.DEVICE_ACCESS_DENIED);
}

export { ERROR_CODES };
