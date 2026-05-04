export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export function badRequestError(message = 'Bad request.', code = 'BAD_REQUEST', details = undefined) {
  return new AppError(message, 400, code, details);
}

export function unauthorizedError(message = 'Authentication is required.', code = 'UNAUTHORIZED') {
  return new AppError(message, 401, code);
}

export function forbiddenError(message = 'You do not have permission to access this resource.', code = 'FORBIDDEN') {
  return new AppError(message, 403, code);
}

export function notFoundError(message = 'Route not found.', code = 'ROUTE_NOT_FOUND') {
  return new AppError(message, 404, code);
}

export function conflictError(message = 'Resource conflict.', code = 'CONFLICT') {
  return new AppError(message, 409, code);
}

export function validationError(details, message = 'Validation failed.') {
  return new AppError(message, 400, 'VALIDATION_ERROR', details);
}
