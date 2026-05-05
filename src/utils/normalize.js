export function normalizeMachineCode(value) {
  return String(value || '').trim().toUpperCase();
}

export function normalizePairingCode(value) {
  return String(value || '').trim().toUpperCase();
}

export function normalizeDeviceId(value) {
  return String(value || '').trim();
}

export function emptyToNull(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}
