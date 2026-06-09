import { getPool } from '../config/db.js';
import { syncPassword, verifyCredential } from './mqttPasswordSync.service.js';

/**
 * Credential Reconciler
 * ---------------------
 * Mục đích: đảm bảo MỌI credential active trong DB tồn tại trên MQTT broker.
 *
 * Vấn đề giải quyết:
 *   - Trước đây sync fail (sai IP, broker down) → credential trong DB
 *     nhưng KHÔNG có trên Mosquitto → device không thể connect.
 *   - Hàm này cho phép re-sync hàng loạt thay vì phải rotate từng device.
 *
 * Cách phát hiện "chưa sync":
 *   - Ưu tiên: cột `password_synced_at IS NULL` (sau khi thêm migration).
 *   - Fallback: nếu cột chưa có → sync tất cả (idempotent, broker tự overwrite).
 *   - Tùy chọn: tham số `verifyFirst=true` để gọi /verify trước (chậm hơn,
 *     chính xác hơn).
 *
 * An toàn:
 *   - Idempotent: gọi nhiều lần không sao.
 *   - Có giới hạn batch size tránh spam broker.
 *   - Có delay giữa các lần gọi.
 *   - Không xóa credential DB kể cả khi sync fail (an toàn để retry).
 */

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_DELAY_MS = 100; // delay giữa các lần gọi API

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Lấy danh sách credentials cần sync.
 * Tự động phát hiện cột `password_synced_at` có tồn tại không.
 */
async function fetchCredentialsToSync({ onlyUnsynced = true, brokerId = null } = {}) {
  const pool = getPool();

  // Check column existence (cheap query, 1 row)
  const [colRows] = await pool.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'device_mqtt_credentials'
       AND COLUMN_NAME = 'password_synced_at'`
  );
  const hasSyncedAtColumn = Number(colRows[0]?.cnt || 0) > 0;

  const where = ['dmc.is_active = 1'];
  const values = [];

  if (hasSyncedAtColumn && onlyUnsynced) {
    where.push('dmc.password_synced_at IS NULL');
  }
  // Nếu không có cột password_synced_at → vô hiệu hóa filter onlyUnsynced
  // (sẽ sync tất cả, idempotent).

  if (brokerId) {
    where.push('dmc.mqtt_server_id = ?');
    values.push(brokerId);
  }

  const syncedAtSelect = hasSyncedAtColumn ? 'dmc.password_synced_at,' : 'NULL AS password_synced_at,';
  const sql = `
    SELECT
      dmc.id AS cred_id,
      dmc.device_id,
      dmc.mqtt_server_id,
      dmc.mqtt_username,
      dmc.mqtt_password,
      ${syncedAtSelect}
      s.host AS broker_host,
      s.is_active AS broker_active
    FROM device_mqtt_credentials dmc
    JOIN mqtt_servers s ON s.id = dmc.mqtt_server_id
    WHERE ${where.join(' AND ')}
    ORDER BY dmc.id ASC
    LIMIT ${DEFAULT_BATCH_SIZE}
  `;

  const [rows] = await pool.query(sql, values);
  return { rows, hasSyncedAtColumn };
}

/**
 * Đánh dấu credential đã sync thành công (nếu có cột).
 */
async function markSynced(credId) {
  const pool = getPool();
  // Check column existence once (cached at module load is overkill, chỉ check tại đây)
  const [colRows] = await pool.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'device_mqtt_credentials'
       AND COLUMN_NAME = 'password_synced_at'`
  );
  if (Number(colRows[0]?.cnt || 0) === 0) return; // column chưa có → skip
  await pool.query(
    `UPDATE device_mqtt_credentials
     SET password_synced_at = NOW(), updated_at = NOW()
     WHERE id = ?`,
    [credId]
  );
}

/**
 * Sync một credential lên broker.
 * Trả về { ok, reason } để caller tổng hợp.
 */
async function syncOne(cred) {
  // Pre-check: verify trước để skip nếu đã OK
  const alreadyValid = await verifyCredential(cred.mqtt_username, cred.mqtt_password);
  if (alreadyValid) {
    await markSynced(cred.cred_id);
    return { ok: true, reason: 'already_valid', credId: cred.cred_id };
  }

  // Verify fail → thử sync
  const synced = await syncPassword(cred.mqtt_username, cred.mqtt_password);
  if (synced) {
    await markSynced(cred.cred_id);
    return { ok: true, reason: 'synced', credId: cred.cred_id };
  }

  return { ok: false, reason: 'sync_failed', credId: cred.cred_id };
}

/**
 * Hàm chính: reconcile toàn bộ credentials unsynced.
 *
 * @param {object} options
 * @param {boolean} [options.onlyUnsynced=true]
 *   true: chỉ sync những record password_synced_at IS NULL
 *   false: sync tất cả (idempotent, dùng khi đổi broker)
 * @param {number|null} [options.brokerId=null]
 *   Lọc theo mqtt_server_id cụ thể. null = tất cả broker active.
 * @param {boolean} [options.verifyFirst=true]
 *   true: gọi /verify trước khi sync (chính xác nhưng chậm).
 *   false: sync thẳng (nhanh, idempotent).
 * @param {number} [options.delayMs=100]
 *   Delay giữa mỗi lần gọi (tránh spam broker).
 * @param {(progress) => void} [options.onProgress]
 *   Callback báo progress (cho CLI / API streaming).
 *
 * @returns {Promise<{total: number, synced: number, skipped: number, failed: number, failedItems: Array}>}
 */
export async function reconcileMqttCredentials(options = {}) {
  const {
    onlyUnsynced = true,
    brokerId = null,
    verifyFirst = true,
    delayMs = DEFAULT_DELAY_MS,
    onProgress = null
  } = options;

  const pool = getPool();
  const stats = { total: 0, synced: 0, skipped: 0, failed: 0, failedItems: [] };

  // Lấy danh sách theo batch
  const { rows, hasSyncedAtColumn } = await fetchCredentialsToSync({ onlyUnsynced, brokerId });

  stats.total = rows.length;

  if (onProgress) {
    onProgress({ phase: 'start', total: stats.total, hasSyncedAtColumn });
  }

  for (let i = 0; i < rows.length; i += 1) {
    const cred = rows[i];

    if (onProgress) {
      onProgress({
        phase: 'processing',
        index: i + 1,
        total: stats.total,
        username: cred.mqtt_username,
        brokerHost: cred.broker_host
      });
    }

    try {
      if (!verifyFirst) {
        // Skip verify, sync thẳng
        const synced = await syncPassword(cred.mqtt_username, cred.mqtt_password);
        if (synced) {
          await markSynced(cred.cred_id);
          stats.synced += 1;
        } else {
          stats.failed += 1;
          stats.failedItems.push({ credId: cred.cred_id, username: cred.mqtt_username, reason: 'sync_returned_false' });
        }
      } else {
        const result = await syncOne(cred);
        if (result.ok) {
          if (result.reason === 'already_valid') {
            stats.skipped += 1;
          } else {
            stats.synced += 1;
          }
        } else {
          stats.failed += 1;
          stats.failedItems.push({ credId: cred.cred_id, username: cred.mqtt_username, reason: result.reason });
        }
      }
    } catch (error) {
      stats.failed += 1;
      stats.failedItems.push({
        credId: cred.cred_id,
        username: cred.mqtt_username,
        reason: error.message
      });
    }

    if (delayMs > 0 && i < rows.length - 1) {
      await sleep(delayMs);
    }
  }

  if (onProgress) {
    onProgress({ phase: 'done', ...stats });
  }

  return stats;
}

/**
 * CLI entry: chạy reconcile thủ công.
 *   node src/cli/reconcileMqttCredentials.js [--all] [--broker-id=N] [--no-verify]
 */
export async function runReconcileCli(argv = process.argv.slice(2)) {
  const onlyUnsynced = !argv.includes('--all');
  const verifyFirst = !argv.includes('--no-verify');
  const brokerIdArg = argv.find((a) => a.startsWith('--broker-id='));
  const brokerId = brokerIdArg ? Number(brokerIdArg.split('=')[1]) : null;

  console.log('[reconcile] starting...', { onlyUnsynced, verifyFirst, brokerId });

  const result = await reconcileMqttCredentials({
    onlyUnsynced,
    verifyFirst,
    brokerId,
    onProgress: (p) => {
      if (p.phase === 'start') {
        console.log(`[reconcile] found ${p.total} credential(s) to process (hasSyncedAtColumn=${p.hasSyncedAtColumn})`);
      } else if (p.phase === 'processing') {
        console.log(`[reconcile] [${p.index}/${p.total}] syncing ${p.username} @ ${p.brokerHost}`);
      } else if (p.phase === 'done') {
        console.log('[reconcile] done', p);
      }
    }
  });

  console.log('[reconcile] result:', result);
  return result;
}
