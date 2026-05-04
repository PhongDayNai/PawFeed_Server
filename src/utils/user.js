export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function toPublicUser(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    fullName: row.full_name ?? null,
    email: row.email,
    role: row.role,
    isDisabled: Boolean(row.is_disabled),
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null
  };
}
