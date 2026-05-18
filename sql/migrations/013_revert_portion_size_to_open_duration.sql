-- Migration 013: Revert portion_size back to open_duration_ms in feeding_schedule_items
-- Decision: Use openDurationMs for schedule items instead of portionSize

SET @db_name = DATABASE();
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'feeding_schedule_items' AND COLUMN_NAME = 'portion_size');

-- Drop old column if it exists
SET @sql = IF(@col_exists > 0, 'ALTER TABLE feeding_schedule_items DROP COLUMN portion_size', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add new column if it doesn't exist
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'feeding_schedule_items' AND COLUMN_NAME = 'open_duration_ms');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE feeding_schedule_items ADD COLUMN open_duration_ms INT NOT NULL DEFAULT 1000 AFTER time_of_day', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
