import { getPool } from '../config/db.js';
import { notFoundError } from '../utils/errors.js';
import { buildPaginationMeta, paginationFromQuery } from '../utils/pagination.js';
import { writeAuditLog } from './audit.service.js';

function toIso(value) {
  return value ? new Date(value).toISOString() : null;
}

function safeJsonParse(value, fallback = null) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

function toSystemSetting(row) {
  return {
    key: row.setting_key,
    value: safeJsonParse(row.setting_value, null),
    description: row.description || null,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

function toAuditLog(row) {
  return {
    id: Number(row.id),
    actorUserId: row.actor_user_id === null ? null : Number(row.actor_user_id),
    actor: row.actor_email ? { id: Number(row.actor_user_id), email: row.actor_email, fullName: row.actor_full_name || null } : null,
    action: row.action,
    targetType: row.target_type || null,
    targetId: row.target_id || null,
    payload: safeJsonParse(row.payload, null),
    clientIp: row.client_ip || null,
    userAgent: row.user_agent || null,
    createdAt: toIso(row.created_at)
  };
}

export async function listSystemSettings() {
  const [rows] = await getPool().execute(
    `SELECT setting_key, setting_value, description, created_at, updated_at
     FROM system_settings ORDER BY setting_key ASC`
  );
  return rows.map(toSystemSetting);
}

async function upsertSetting({ key, value, description = null }, connection) {
  await connection.execute(
    `INSERT INTO system_settings (setting_key, setting_value, description, created_at, updated_at)
     VALUES (?, CAST(? AS JSON), ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), description = COALESCE(VALUES(description), description), updated_at = NOW()`,
    [key, JSON.stringify(value), description]
  );
}

export async function patchSystemSettings(input, context = {}) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const changed = [];

    if (input.provider) {
      await upsertSetting({ key: 'provider', value: input.provider, description: 'Provider info included in generated config files.' }, connection);
      changed.push('provider');
    }

    if (input.serverDefaults) {
      await upsertSetting({ key: 'server_defaults', value: input.serverDefaults, description: 'Default values used while generating config files and setup screens.' }, connection);
      changed.push('server_defaults');
    }

    for (const setting of input.settings || []) {
      await upsertSetting({ key: setting.key, value: setting.value, description: setting.description ?? null }, connection);
      changed.push(setting.key);
    }

    await writeAuditLog({
      actorUserId: context.actorUserId,
      action: 'admin.system_settings.patch',
      targetType: 'system_settings',
      targetId: 'multiple',
      payload: { changedKeys: changed },
      clientIp: context.clientIp,
      userAgent: context.userAgent,
      connection
    });

    await connection.commit();
    return listSystemSettings();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listAuditLogs(query = {}) {
  const { page, limit, offset } = paginationFromQuery(query);
  const conditions = [];
  const values = [];

  if (query.actorUserId) { conditions.push('a.actor_user_id = ?'); values.push(query.actorUserId); }
  if (query.action) { conditions.push('a.action = ?'); values.push(query.action); }
  if (query.targetType) { conditions.push('a.target_type = ?'); values.push(query.targetType); }
  if (query.targetId) { conditions.push('a.target_id = ?'); values.push(query.targetId); }
  if (query.from) { conditions.push('a.created_at >= ?'); values.push(query.from); }
  if (query.to) { conditions.push('a.created_at <= ?'); values.push(query.to); }

  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [countRows] = await getPool().execute(`SELECT COUNT(*) AS total FROM audit_logs a ${whereSql}`, values);
  const [rows] = await getPool().execute(
    `SELECT a.*, u.email AS actor_email, u.full_name AS actor_full_name
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.actor_user_id
     ${whereSql}
     ORDER BY a.created_at DESC, a.id DESC
     LIMIT ${limit} OFFSET ${offset}`,
    values
  );

  return {
    logs: rows.map(toAuditLog),
    meta: buildPaginationMeta({ page, limit, total: Number(countRows[0]?.total || 0) })
  };
}

export async function getSystemSetting(key) {
  const [rows] = await getPool().execute('SELECT * FROM system_settings WHERE setting_key = ? LIMIT 1', [key]);
  if (!rows[0]) throw notFoundError('System setting was not found.', 'SYSTEM_SETTING_NOT_FOUND');
  return toSystemSetting(rows[0]);
}

export const __adminSystemInternals = { toSystemSetting, toAuditLog };
