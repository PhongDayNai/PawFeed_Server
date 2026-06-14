-- Migration 020: Tạo bảng chatbot_wiki để lưu thông tin từ điển/wiki cho chatbot
-- Mục đích: Lưu trữ thông tin hướng dẫn, định nghĩa chính xác để chatbot tra cứu.

CREATE TABLE IF NOT EXISTS chatbot_wiki (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  keyword VARCHAR(255) NOT NULL UNIQUE, -- Hỗ trợ danh sách từ khóa đồng nghĩa cách nhau bằng dấu phẩy (ví dụ: 'chó con,cún,cún con')
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_chatbot_wiki_keyword (keyword)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
