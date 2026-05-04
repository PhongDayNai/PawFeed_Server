export function successResponse(data = {}, meta = undefined) {
  return {
    ok: true,
    ...data,
    ...(meta ? { meta } : {})
  };
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
