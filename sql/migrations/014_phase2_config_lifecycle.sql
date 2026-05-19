-- Migration 014: Phase 2 - Config Lifecycle + Version Field
SET @db_name = DATABASE();
SET @col_exists = 0;
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'device_config_generations' AND COLUMN_NAME = 'revoked_at');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE device_config_generations ADD COLUMN revoked_at DATETIME NULL AFTER status', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'device_config_generations' AND COLUMN_NAME = 'revoked_reason');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE device_config_generations ADD COLUMN revoked_reason VARCHAR(255) NULL AFTER revoked_at', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'device_config_generations' AND COLUMN_NAME = 'applied_at');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE device_config_generations ADD COLUMN applied_at DATETIME NULL AFTER revoked_reason', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'feeding_schedules' AND COLUMN_NAME = 'version');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE feeding_schedules ADD COLUMN version INT NOT NULL DEFAULT 1 AFTER enabled', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
