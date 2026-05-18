import { getPool } from '../config/db.js';
import { buildPaginationMeta, paginationFromQuery } from '../utils/pagination.js';
import { redactSensitive } from '../utils/redact.js';
// SECRET_KEY_PATTERN moved to src/utils/redact.js in Phase 19.

export const AUDIT_ACTIONS = Object.freeze({
  ADMIN_DEVICE_CREATE: 'admin.device.create',
  ADMIN_DEVICE_UPDATE: 'admin.device.update',
  ADMIN_DEVICE_DISABLE: 'admin.device.disable',
  ADMIN_DEVICE_ENABLE: 'admin.device.enable',
  ADMIN_DEVICE_REVOKE: 'admin.device.revoke',
  ADMIN_DEVICE_UNLINK: 'admin.device.unlink',
  ADMIN_DEVICE_TRANSFER_OWNER: 'admin.device.transfer_owner',
  ADMIN_DEVICE_ROTATE_PAIRING_CODE: 'admin.device.rotate_pairing_code',
  ADMIN_DEVICE_ROTATE_MQTT_CREDENTIAL: 'admin.device.rotate_mqtt_credential',
  ADMIN_DEVICE_ROTATE_MQTT_PASSWORD: 'admin.device.rotate_mqtt_password',
  ADMIN_DEVICE_ROTATE_DEVICE_SECRET: 'admin.device.rotate_device_secret',
  ADMIN_MQTT_SERVER_CREATE: 'admin.mqtt_server.create',
  ADMIN_MQTT_SERVER_UPDATE: 'admin.mqtt_server.update',
  ADMIN_MQTT_SERVER_TEST: 'admin.mqtt_server.test',
  ADMIN_CONFIG_GENERATION_REVOKE: 'admin.config_generation.revoke',
  ADMIN_SYSTEM_SETTINGS_PATCH: 'admin.system_settings.patch',
  ADMIN_USER_UPDATE: 'admin.user.update',
  ADMIN_USER_DISABLE: 'admin.user.disable',
  ADMIN_USER_ENABLE: 'admin.user.enable',
  ADMIN_USER_RESET_PASSWORD: 'admin.user.reset_password',
  USER_DEVICE_LINK: 'user.device.link',
  USER_DEVICE_UPDATE: 'user.device.update',
  USER_DEVICE_UNLINK: 'user.device.unlink',
  USER_DEVICE_CURRENT_CONFIG_SAVE: 'user.device.current_config.save',
  USER_DEVICE_SCHEDULE_SAVE: 'user.device.schedule.save',
  USER_DEVICE_CONFIG_FILE_GENERATE: 'user.device.config_file.generate',
  USER_DEVICE_CONFIG_FILE_REGENERATE: 'user.device.config_file.regenerate',
  USER_DEVICE_FEED_NOW_REQUESTED: 'user.device.command.feed_now.requested'
});

export function sanitizeAuditMetadata(metadata) {
  return redactSensitive(metadata);
}

function metadataToJson(metadata) {
  if (metadata === undefined || metadata === null) return null;
  return JSON.stringify(sanitizeAuditMetadata(metadata));
}

function safeJsonParse(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toIso(value) {
  return value ? new Date(value).toISOString() : null;
}

export async function writeAuditLog({
  actorUserId = null,
  actorRole = null,
  action,
  targetType = null,
  targetId = null,
  metadata = undefined,
  payload = undefined,
  clientIp = null,
  userAgent = null,
  connection = null
}) {
  if (!action || typeof action !== 'string') {
    throw new Error('Audit action is required.');
  }

  const executor = connection || getPool();
  let finalActorRole = actorRole;
  if (!finalActorRole && actorUserId) {
    try {
      const [actorRows] = await executor.execute('SELECT role FROM users WHERE id = ? LIMIT 1', [actorUserId]);
      finalActorRole = actorRows[0]?.role || null;
    } catch {
      finalActorRole = null;
    }
  }

  const auditMetadata = metadata !== undefined ? metadata : payload;
  const metadataJson = metadataToJson(auditMetadata);

  await executor.execute(
    `INSERT INTO audit_logs (
      actor_user_id,
      actor_role,
      action,
      target_type,
      target_id,
      metadata,
      payload,
      client_ip,
      user_agent,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      actorUserId,
      finalActorRole,
      action,
      targetType,
      targetId,
      metadataJson,
      metadataJson,
      clientIp,
      userAgent
    ]
  );
}

function toAuditLog(row) {
  const metadata = safeJsonParse(row.metadata ?? row.payload, null);
  return {
    id: Number(row.id),
    actorUserId: row.actor_user_id === null ? null : Number(row.actor_user_id),
    actorRole: row.actor_role || null,
    actor: row.actor_email
      ? {
          id: Number(row.actor_user_id),
          email: row.actor_email,
          fullName: row.actor_full_name || null,
          role: row.actor_role || row.actor_db_role || null
        }
      : null,
    action: row.action,
    targetType: row.target_type || null,
    targetId: row.target_id || null,
    metadata,
    // Backward-compatible alias for Phase 15-17 clients.
    payload: metadata,
    clientIp: row.client_ip || null,
    userAgent: row.user_agent || null,
    createdAt: toIso(row.created_at)
  };
}

function addDateRangeFilter(conditions, values, field, from, to) {
  if (from) { conditions.push(`${field} >= ?`); values.push(from); }
  if (to) { conditions.push(`${field} <= ?`); values.push(to); }
}

function buildAuditWhere(query = {}) {
  const conditions = [];
  const values = [];

  if (query.actorUserId) { conditions.push('a.actor_user_id = ?'); values.push(query.actorUserId); }
  if (query.actorRole) { conditions.push('a.actor_role = ?'); values.push(query.actorRole); }
  if (query.action) { conditions.push('a.action = ?'); values.push(query.action); }
  if (query.actionPrefix) { conditions.push('a.action LIKE ?'); values.push(`${query.actionPrefix}%`); }
  if (query.targetType) { conditions.push('a.target_type = ?'); values.push(query.targetType); }
  if (query.targetId) { conditions.push('a.target_id = ?'); values.push(query.targetId); }
  if (query.clientIp) { conditions.push('a.client_ip = ?'); values.push(query.clientIp); }
  if (query.actorEmail) { conditions.push('u.email LIKE ?'); values.push(`%${query.actorEmail}%`); }
  if (query.q) {
    conditions.push('(a.action LIKE ? OR a.target_type LIKE ? OR a.target_id LIKE ? OR u.email LIKE ? OR u.full_name LIKE ?)');
    const keyword = `%${query.q}%`;
    values.push(keyword, keyword, keyword, keyword, keyword);
  }
  addDateRangeFilter(conditions, values, 'a.created_at', query.from, query.to);

  return {
    whereSql: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    values
  };
}

const AUDIT_SELECT = `
  SELECT
    a.id,
    a.actor_user_id,
    a.actor_role,
    a.action,
    a.target_type,
    a.target_id,
    a.metadata,
    a.payload,
    a.client_ip,
    a.user_agent,
    a.created_at,
    u.email AS actor_email,
    u.full_name AS actor_full_name,
    u.role AS actor_db_role
  FROM audit_logs a
  LEFT JOIN users u ON u.id = a.actor_user_id
`;

export async function listAuditLogs(query = {}) {
  const { page, pageSize, offset } = paginationFromQuery(query);
  const { whereSql, values } = buildAuditWhere(query);

  const [countRows] = await getPool().execute(
    `SELECT COUNT(*) AS total FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id ${whereSql}`,
    values
  );
  const [rows] = await getPool().execute(
    `${AUDIT_SELECT}
     ${whereSql}
     ORDER BY a.created_at DESC, a.id DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    values
  );

  return {
    logs: rows.map(toAuditLog),
    meta: buildPaginationMeta({ page, pageSize, totalItems: Number(countRows[0]?.total || 0) })
  };
}

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function auditLogsToCsv(logs) {
  const headers = ['id', 'createdAt', 'actorUserId', 'actorRole', 'actorEmail', 'action', 'targetType', 'targetId', 'clientIp', 'metadata'];
  const lines = [headers.join(',')];
  for (const log of logs) {
    lines.push([
      log.id,
      log.createdAt,
      log.actorUserId,
      log.actorRole,
      log.actor?.email || null,
      log.action,
      log.targetType,
      log.targetId,
      log.clientIp,
      log.metadata
    ].map(escapeCsv).join(','));
  }
  return `${lines.join('\n')}\n`;
}

export async function exportAuditLogsCsv(query = {}) {
  const limit = Math.min(Number(query.limit || 1000), 5000);
  const result = await listAuditLogs({ ...query, page: 1, limit });
  return {
    csv: auditLogsToCsv(result.logs),
    exportedCount: result.logs.length,
    totalMatched: result.meta.total
  };
}

export const __auditInternals = {
  AUDIT_ACTIONS,
  sanitizeAuditMetadata,
  toAuditLog,
  buildAuditWhere,
  auditLogsToCsv
};
