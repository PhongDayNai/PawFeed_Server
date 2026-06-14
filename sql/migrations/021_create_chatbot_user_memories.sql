-- Migration 021: Tạo bảng chatbot_user_memories để lưu bộ nhớ (memory) của user (hỗ trợ Multi-Pet)
-- Mục đích: lưu các thông tin đặc thù của người dùng hoặc các bé cưng (loại hạt, giống loài, cân nặng...) để chatbot có thể truy xuất.

CREATE TABLE IF NOT EXISTS chatbot_user_memories (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  entity_name VARCHAR(100) NOT NULL DEFAULT 'general',
  memory_key VARCHAR(100) NOT NULL,
  memory_value TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uq_user_entity_key (user_id, entity_name, memory_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
