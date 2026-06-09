-- Migration 004: Thêm cột password_synced_at cho device_mqtt_credentials
-- Mục đích: đánh dấu credential đã được sync lên MQTT broker thành công.
-- Dùng cho tool reconcile: WHERE password_synced_at IS NULL → cần sync.
--
-- Idempotent: chạy nhiều lần an toàn.

ALTER TABLE device_mqtt_credentials
  ADD COLUMN IF NOT EXISTS password_synced_at DATETIME NULL AFTER updated_at,
  ADD INDEX IF NOT EXISTS idx_device_mqtt_credentials_synced_at (password_synced_at);

-- Backfill: với credential cũ (đã tồn tại trước migration), set synced_at = NOW()
-- để tránh re-sync toàn bộ. Sau đó chạy tool reconcile với --all nếu muốn.
UPDATE device_mqtt_credentials
SET password_synced_at = NOW()
WHERE password_synced_at IS NULL AND is_active = 1;
