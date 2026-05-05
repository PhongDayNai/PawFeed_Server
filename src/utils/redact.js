export const REDACTED = '[REDACTED]';

const SENSITIVE_KEY_PATTERN = /(^|[_-])(password|pass|secret|token|authorization|cookie|claim[_-]?code|pairing[_-]?code|signature|credential|mqtt[_-]?pass|wifi[_-]?pass)([_-]|$)/i;
const SENSITIVE_HEADER_PATTERN = /^(authorization|cookie|set-cookie|x-api-key|proxy-authorization)$/i;

export function isSensitiveKey(key = '') {
  return SENSITIVE_KEY_PATTERN.test(String(key));
}

export function redactSensitive(value, depth = 0, seen = new WeakSet()) {
  if (depth > 10) return '[MAX_DEPTH]';
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => redactSensitive(item, depth + 1, seen));
  if (typeof value !== 'object') return value;

  if (seen.has(value)) return '[CIRCULAR]';
  seen.add(value);

  const output = {};
  for (const [key, child] of Object.entries(value)) {
    output[key] = isSensitiveKey(key) ? REDACTED : redactSensitive(child, depth + 1, seen);
  }
  return output;
}

export function redactHeaders(headers = {}) {
  const redacted = {};
  for (const [key, value] of Object.entries(headers)) {
    redacted[key] = SENSITIVE_HEADER_PATTERN.test(key) || isSensitiveKey(key) ? REDACTED : value;
  }
  return redacted;
}

export function safeErrorLog(error) {
  return redactSensitive({
    name: error?.name,
    message: error?.message,
    code: error?.code,
    statusCode: error?.statusCode || error?.status,
    details: error?.details
  });
}
