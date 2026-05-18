-- Migration 012: Rename open_duration_ms to portion_size in feeding_schedule_items
-- This aligns with spec v4 schedule entry schema using portionSize instead of openDurationMs

SET @db_name = DATABASE();
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'feeding_schedule_items' AND COLUMN_NAME = 'open_duration_ms');

-- Drop old column if it exists
SET @sql = IF(@col_exists > 0, 'ALTER TABLE feeding_schedule_items DROP COLUMN open_duration_ms', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add new column if it doesn't exist
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'feeding_schedule_items' AND COLUMN_NAME = 'portion_size');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE feeding_schedule_items ADD COLUMN portion_size INT NOT NULL DEFAULT 50 AFTER time_of_day', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;