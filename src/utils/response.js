export function successResponse(data = {}, meta = undefined) {
  return {
    ok: true,
    ...data,
    ...(meta ? { meta } : {})
  };
}

export function paginatedResponse(items, meta, key = 'items') {
  return successResponse({ [key]: items }, meta);
}

export function errorResponse({ code = 'INTERNAL_SERVER_ERROR', message = 'Internal server error.', details } = {}) {
  return {
    ok: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {})
    }
  };
}

export function sendSuccess(res, data = {}, statusCode = 200, meta = undefined) {
  return res.status(statusCode).json(successResponse(data, meta));
}

export function sendCreated(res, data = {}, meta = undefined) {
  return sendSuccess(res, data, 201, meta);
}

export function sendPaginated(res, items, meta, key = 'items') {
  return res.json(paginatedResponse(items, meta, key));
}

export function sendNoContent(res) {
  return res.status(204).send();
}
