ALTER TABLE device_commands
ADD COLUMN retry_count INT DEFAULT 0 AFTER queued_at;

CREATE INDEX idx_device_commands_retry_count ON device_commands(retry_count);