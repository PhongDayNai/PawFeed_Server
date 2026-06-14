-- Migration 023: Thay đổi index của client_msg_id thành unique index theo cặp (user_id, client_msg_id)
ALTER TABLE chatbot_messages DROP INDEX idx_chatbot_messages_client_msg_id;
ALTER TABLE chatbot_messages ADD UNIQUE KEY uq_user_client_msg (user_id, client_msg_id);
