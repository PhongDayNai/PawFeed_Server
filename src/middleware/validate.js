import { ZodError } from 'zod';
import { validationError } from '../utils/errors.js';

function formatPath(path = []) {
  return path.length > 0 ? path.join('.') : '$';
}

export function formatZodIssues(error) {
  return (error.issues || []).map((issue) => ({
    path: formatPath(issue.path),
    code: issue.code,
    message: issue.message,
    ...(issue.expected !== undefined ? { expected: issue.expected } : {}),
    ...(issue.received !== undefined ? { received: issue.received } : {})
  }));
}

function validate(schema, source) {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return next(
        validationError(formatZodIssues(result.error), {
          source
        })
      );
    }

    req[source] = result.data;
    return next();
  };
}

export function validateBody(schema) {
  return validate(schema, 'body');
}

export function validateQuery(schema) {
  return validate(schema, 'query');
}

export function validateParams(schema) {
  return validate(schema, 'params');
}

export function validateRequest({ body, query, params } = {}) {
  return (req, _res, next) => {
    try {
      if (params) req.params = params.parse(req.params);
      if (query) req.query = query.parse(req.query);
      if (body) req.body = body.parse(req.body);
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(validationError(formatZodIssues(error)));
      }
      return next(error);
    }
  };
}
