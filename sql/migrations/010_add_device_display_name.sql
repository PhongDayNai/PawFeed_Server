ALTER TABLE devices
  ADD COLUMN display_name VARCHAR(255) NULL AFTER machine_code;

CREATE INDEX idx_devices_display_name ON devices (display_name);
