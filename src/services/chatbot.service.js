import { getPool } from '../config/db.js';

/**
 * Saves a single chat message to the database
 * @param {Object} params
 * @param {number} params.userId
 * @param {string} params.role 'user', 'assistant', or 'system'
 * @param {string} params.content
 * @param {string} params.model
 */
export async function saveChatMessage({ userId, role, content, model }) {
  const pool = getPool();
  await pool.execute(
    `INSERT INTO chatbot_messages (user_id, role, content, model, created_at)
     VALUES (?, ?, ?, ?, NOW())`,
    [userId, role, content, model]
  );
}

/**
 * Retrieves the chat history for a user, sorted chronologically
 * @param {number} userId
 * @param {number} [limit=50] Number of recent messages to fetch
 * @returns {Promise<Array>} List of chat messages
 */
export async function getUserChatHistory(userId, limit = 50) {
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT role, content, model, created_at
     FROM (
       SELECT id, role, content, model, created_at
       FROM chatbot_messages
       WHERE user_id = ?
       ORDER BY id DESC
       LIMIT ${limit}
     ) sub
     ORDER BY id ASC`,
    [userId]
  );

  return rows.map((r) => ({
    role: r.role,
    content: r.content,
    model: r.model,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : null
  }));
}
