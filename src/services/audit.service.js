import { getPool } from '../config/db.js';

export async function writeAuditLog({
  actorUserId = null,
  action,
  targetType = null,
  targetId = null,
  payload = null,
  clientIp = null,
  userAgent = null,
  connection = null
}) {
  const executor = connection || getPool();
  await executor.execute(
    `INSERT INTO audit_logs (
      actor_user_id,
      action,
      target_type,
      target_id,
      payload,
      client_ip,
      user_agent,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      actorUserId,
      action,
      targetType,
      targetId,
      payload ? JSON.stringify(payload) : null,
      clientIp,
      userAgent
    ]
  );
}
