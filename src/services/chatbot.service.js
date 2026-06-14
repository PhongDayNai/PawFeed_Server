import { getPool } from '../config/db.js';

/**
 * Saves a single chat message to the database
 * @param {Object} params
 * @param {number} params.userId
 * @param {string} params.role 'user', 'assistant', or 'system'
 * @param {string} params.content
 * @param {string} params.model
 */
export async function saveChatMessage({ userId, role, content, model, sessionId }) {
  const pool = getPool();
  await pool.execute(
    `INSERT INTO chatbot_messages (user_id, session_id, role, content, model, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, sessionId, role, content, model, new Date()]
  );
}

/**
 * Retrieves the last chat message for a user to determine active session
 * @param {number} userId
 * @returns {Promise<Object|null>} Last chat message or null
 */
export async function getLastChatMessage(userId) {
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT session_id, created_at
     FROM chatbot_messages
     WHERE user_id = ?
     ORDER BY id DESC
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

/**
 * Retrieves the chat history for a specific session of a user, sorted chronologically
 * @param {number} userId
 * @param {string} sessionId
 * @returns {Promise<Array>} List of chat messages in the session
 */
export async function getSessionChatHistory(userId, sessionId) {
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT role, content
     FROM chatbot_messages
     WHERE user_id = ? AND session_id = ?
     ORDER BY id ASC`,
    [userId, sessionId]
  );
  return rows.map((r) => ({
    role: r.role,
    content: r.content
  }));
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
    `SELECT role, content, model, session_id, created_at
     FROM (
       SELECT id, role, content, model, session_id, created_at
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
    sessionId: r.session_id,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : null
  }));
}
