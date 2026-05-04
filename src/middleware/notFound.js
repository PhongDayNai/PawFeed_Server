import { notFoundError } from '../utils/errors.js';

export function notFoundHandler(req, _res, next) {
  next(notFoundError(`Cannot ${req.method} ${req.originalUrl}`));
}
