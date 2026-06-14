-- Migration 018: Tạo bảng chatbot_messages để lưu lịch sử chat của user
-- Mục đích: lưu lại các câu hỏi của user và câu trả lời của AI trợ lý.

CREATE TABLE IF NOT EXISTS chatbot_messages (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  role ENUM('system', 'user', 'assistant') NOT NULL,
  content TEXT NOT NULL,
  model VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_chatbot_messages_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
