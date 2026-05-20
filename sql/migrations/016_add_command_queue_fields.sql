ALTER TABLE device_commands
ADD COLUMN queued_at DATETIME NULL AFTER completed_at;

CREATE INDEX idx_device_commands_queued_at ON device_commands(queued_at);
