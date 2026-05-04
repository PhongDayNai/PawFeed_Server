import { validationError } from '../utils/errors.js';

function formatZodIssues(error) {
  return error.issues?.map((issue) => ({
    path: issue.path.join('.'),
    code: issue.code,
    message: issue.message
  })) || [];
}

function validate(schema, source) {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return next(validationError(formatZodIssues(result.error)));
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
