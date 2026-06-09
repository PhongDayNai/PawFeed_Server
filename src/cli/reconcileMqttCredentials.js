#!/usr/bin/env node
/**
 * CLI: Reconcile MQTT credentials (DB ↔ Broker)
 *
 * Usage:
 *   node src/cli/reconcileMqttCredentials.js                  # sync unsynced only, verify trước
 *   node src/cli/reconcileMqttCredentials.js --all            # sync tất cả (idempotent)
 *   node src/cli/reconcileMqttCredentials.js --no-verify      # bỏ verify, sync thẳng (nhanh hơn)
 *   node src/cli/reconcileMqttCredentials.js --broker-id=1    # chỉ sync broker cụ thể
 *
 * Yêu cầu: chạy từ thư mục project, .env phải có MQTT_SYNC_API_URL đúng.
 */
import { runReconcileCli } from '../services/mqttCredentialReconciler.service.js';

runReconcileCli().then(
  (result) => {
    const exitCode = result.failed > 0 ? 1 : 0;
    process.exit(exitCode);
  },
  (error) => {
    console.error('[reconcile] fatal:', error);
    process.exit(2);
  }
);
