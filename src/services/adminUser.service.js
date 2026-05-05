import bcrypt from 'bcryptjs';
import { getPool } from '../config/db.js';
import { env } from '../config/env.js';
import { conflictError, notFoundError } from '../utils/errors.js';
import { buildPaginationMeta, paginationFromQuery } from '../utils/pagination.js';
import { writeAuditLog } from './audit.service.js';

const SAFE_USER_SELECT = `
  SELECT id, full_name, email, role, is_disabled, created_at, updated_at
  FROM users
`;

function toIso(value) {
  return value ? new Date(value).toISOString() : null;
}

function toBoolean(value) {
  return Boolean(Number(value));
}

function toAdminUser(row) {
  return {
    id: Number(row.id),
    fullName: row.full_name || null,
    email: row.email,
    role: row.role,
    status: toBoolean(row.is_disabled) ? 'disabled' : 'active',
    isDisabled: toBoolean(row.is_disabled),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

async function findUserById(userId, executor = getPool()) {
  const [rows] = await executor.execute(`${SAFE_USER_SELECT} WHERE id = ? LIMIT 1`, [userId]);
  return rows[0] || null;
}

export async function listAdminUsers(query = {}) {
  const { page, limit, offset } = paginationFromQuery(query);
  const conditions = [];
  const values = [];

  if (query.search) {
    conditions.push('(email LIKE ? OR full_name LIKE ?)');
    const keyword = `%${query.search}%`;
    values.push(keyword, keyword);
  }

  if (query.role) {
    conditions.push('role = ?');
    values.push(query.role);
  }

  if (query.status === 'active') {
    conditions.push('is_disabled = FALSE');
  }
  if (query.status === 'disabled') {
    conditions.push('is_disabled = TRUE');
  }

  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [countRows] = await getPool().execute(`SELECT COUNT(*) AS total FROM users ${whereSql}`, values);
  const [rows] = await getPool().execute(
    `${SAFE_USER_SELECT} ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ${limit} OFFSET ${offset}`,
    values
  );

  return {
    users: rows.map(toAdminUser),
    meta: buildPaginationMeta({ page, limit, total: Number(countRows[0]?.total || 0) })
  };
}

export async function getAdminUser(userId) {
  const row = await findUserById(userId);
  if (!row) throw notFoundError('User was not found.', 'USER_NOT_FOUND');
  return toAdminUser(row);
}

export async function updateAdminUser(userId, input, context = {}) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const row = await findUserById(userId, connection);
    if (!row) throw notFoundError('User was not found.', 'USER_NOT_FOUND');

    if (input.email && input.email !== row.email) {
      const [dupes] = await connection.execute('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1', [input.email, userId]);
      if (dupes.length) throw conflictError('Email already exists.', 'EMAIL_ALREADY_EXISTS');
    }

    const fullName = Object.hasOwn(input, 'fullName') ? input.fullName || null : row.full_name;
    const email = input.email || row.email;
    const role = input.role || row.role;

    await connection.execute(
      `UPDATE users SET full_name = ?, email = ?, role = ?, updated_at = NOW() WHERE id = ?`,
      [fullName, email, role, userId]
    );

    await writeAuditLog({
      actorUserId: context.actorUserId,
      action: 'admin.user.update',
      targetType: 'user',
      targetId: String(userId),
      payload: { updatedFields: Object.keys(input) },
      clientIp: context.clientIp,
      userAgent: context.userAgent,
      connection
    });

    await connection.commit();
    return getAdminUser(userId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function setUserDisabled(userId, disabled, context = {}) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const row = await findUserById(userId, connection);
    if (!row) throw notFoundError('User was not found.', 'USER_NOT_FOUND');

    await connection.execute('UPDATE users SET is_disabled = ?, updated_at = NOW() WHERE id = ?', [disabled, userId]);
    await writeAuditLog({
      actorUserId: context.actorUserId,
      action: disabled ? 'admin.user.disable' : 'admin.user.enable',
      targetType: 'user',
      targetId: String(userId),
      payload: { email: row.email, previousDisabled: toBoolean(row.is_disabled) },
      clientIp: context.clientIp,
      userAgent: context.userAgent,
      connection
    });

    await connection.commit();
    return getAdminUser(userId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export function disableAdminUser(userId, context) {
  return setUserDisabled(userId, true, context);
}

export function enableAdminUser(userId, context) {
  return setUserDisabled(userId, false, context);
}

export async function resetAdminUserPassword(userId, input = {}, context = {}) {
  const connection = await getPool().getConnection();
  const temporaryPassword = input.newPassword || `Temp@${Math.random().toString(36).slice(2, 10)}`;
  try {
    await connection.beginTransaction();
    const row = await findUserById(userId, connection);
    if (!row) throw notFoundError('User was not found.', 'USER_NOT_FOUND');

    const passwordHash = await bcrypt.hash(temporaryPassword, env.auth.bcryptSaltRounds);
    await connection.execute('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?', [passwordHash, userId]);

    await writeAuditLog({
      actorUserId: context.actorUserId,
      action: 'admin.user.reset_password',
      targetType: 'user',
      targetId: String(userId),
      payload: { email: row.email, generatedByServer: !input.newPassword },
      clientIp: context.clientIp,
      userAgent: context.userAgent,
      connection
    });

    await connection.commit();
    return {
      user: await getAdminUser(userId),
      temporaryPassword,
      note: 'Return this password only once, then ask the user to change it.'
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export const __adminUserInternals = { toAdminUser };
