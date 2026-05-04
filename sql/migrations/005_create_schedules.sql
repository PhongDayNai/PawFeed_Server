CREATE TABLE IF NOT EXISTS feeding_schedules (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  device_id BIGINT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  timezone VARCHAR(100) DEFAULT 'Asia/Bangkok',
  timezone_offset_sec INT DEFAULT 25200,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  CONSTRAINT fk_feeding_schedules_device_id FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  UNIQUE KEY uq_feeding_schedules_device_id (device_id),
  INDEX idx_feeding_schedules_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS feeding_schedule_items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  schedule_id BIGINT NOT NULL,
  meal_order INT NOT NULL,
  meal_id VARCHAR(100) NULL,
  time_of_day TIME NOT NULL,
  open_duration_ms INT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  CONSTRAINT fk_feeding_schedule_items_schedule_id FOREIGN KEY (schedule_id) REFERENCES feeding_schedules(id) ON DELETE CASCADE,
  UNIQUE KEY uq_feeding_schedule_items_schedule_order (schedule_id, meal_order),
  INDEX idx_feeding_schedule_items_schedule_id (schedule_id),
  INDEX idx_feeding_schedule_items_time_of_day (time_of_day),
  INDEX idx_feeding_schedule_items_enabled (enabled),
  CONSTRAINT chk_feeding_schedule_open_duration CHECK (open_duration_ms BETWEEN 300 AND 10000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
