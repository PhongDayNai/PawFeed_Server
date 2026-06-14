-- Migration 022: Thêm cột client_msg_id vào bảng chatbot_messages để hỗ trợ check retry message
ALTER TABLE chatbot_messages ADD COLUMN client_msg_id VARCHAR(255) NULL AFTER session_id;
ALTER TABLE chatbot_messages ADD INDEX idx_chatbot_messages_client_msg_id (client_msg_id);
