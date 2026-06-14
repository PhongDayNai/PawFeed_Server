-- Migration 019: Thêm cột session_id vào bảng chatbot_messages
-- Mục đích: Hỗ trợ phân tách session chat tự động theo thời gian.
-- Idempotent: chạy nhiều lần an toàn.

ALTER TABLE chatbot_messages ADD COLUMN session_id VARCHAR(36) NULL AFTER user_id;

UPDATE chatbot_messages SET session_id = 'default-session-id-0000-0000-000000000000' WHERE session_id IS NULL;

ALTER TABLE chatbot_messages MODIFY COLUMN session_id VARCHAR(36) NOT NULL;

ALTER TABLE chatbot_messages ADD INDEX idx_chatbot_messages_session_id (session_id);
