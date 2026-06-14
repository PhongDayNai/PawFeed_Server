import { getPool } from '../config/db.js';
import { conflictError, notFoundError } from '../utils/errors.js';
import { buildPaginationMeta, paginationFromQuery } from '../utils/pagination.js';
import { writeAuditLog } from './audit.service.js';

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
 * Retrieves the chat history for a specific session of a user, sorted chronologically.
 * Supports sliding window limit.
 * @param {number} userId
 * @param {string} sessionId
 * @param {number|null} [limit=null] Optional limit for sliding window
 * @returns {Promise<Array>} List of chat messages in the session
 */
export async function getSessionChatHistory(userId, sessionId, limit = null) {
  const pool = getPool();
  
  if (limit !== null && limit !== undefined) {
    const parsedLimit = Number.parseInt(limit, 10);
    const [rows] = await pool.execute(
      `SELECT role, content FROM (
         SELECT id, role, content
         FROM chatbot_messages
         WHERE user_id = ? AND session_id = ?
         ORDER BY id DESC
         LIMIT ${parsedLimit}
       ) sub
       ORDER BY id ASC`,
      [userId, sessionId]
    );
    return rows.map((r) => ({
      role: r.role,
      content: r.content
    }));
  }

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

/**
 * Finds wiki entries whose keyword is a substring of the user's message
 * @param {string} userMessage 
 * @returns {Promise<Array>} List of matching keyword/content rows
 */
export async function findMatchingWikiEntries(userMessage) {
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT keyword, content
     FROM chatbot_wiki`
  );
  const lowerMsg = userMessage.toLowerCase();
  
  // Danh sách các từ khóa ngắn và các cụm từ loại trừ tương ứng tại chính vị trí khớp để tránh False Positives
  const exclusions = {
    'độc': [
      'độc đáo', 'độc nhất', 'độc thân', 'độc lập', 'độc quyền', 'độc thoại', 
      'độc giả', 'độc hành', 'độc tôn', 'độc tài', 'độc học', 'độc vị', 'độc nhất vô nhị'
    ],
    'bò': [
      'bò lê', 'bò càng', 'bò sát', 'bò cạp', 'bọ cạp', 'bò húc', 'bò vẽ', 
      'bò trườn', 'bò ngang', 'bò dậy', 'bò vào', 'bò ra', 'bò lên', 'bò xuống', 
      'bò qua', 'bò lại', 'bò đi', 'bò về', 'cười bò', 'tập bò', 'bò lết', 'bò lổm ngổm',
      'ong bò vẽ', 'cá bò'
    ],
    'cá': [
      'cá tính', 'cá nhân', 'cá thể', 'cá biệt', 'cá cược', 'cá độ', 'cá chậu',
      'cá nằm trên thớt', 'chim lồng cá chậu'
    ],
    'sốt': [
      'sốt sắng', 'sốt ruột', 'sốt đất', 'nước sốt', 'sốt cà chua', 'sốt mayonnaise', 
      'cơn sốt', 'sốt dẻo', 'sốt sột', 'sốt xình xịch', 'sốt sình sịch', 'sốt xập xình'
    ],
    'mực': [
      'bút mực', 'lọ mực', 'mực in', 'mực viết', 'chuẩn mực', 'mực thước', 
      'mực nước', 'mực độ', 'định mực', 'khuôn mực', 'mực dầu', 'mực tàu', 
      'hạn mực', 'khuyến mực'
    ],
    'hạt': [
      'hạt dẻ', 'hạt điều', 'hạt chia', 'hạt sen', 'hạt dưa', 'hạt bí', 'hạt hướng dương', 
      'hạt đậu', 'hạt tiêu', 'hạt lạc', 'hạt vừng', 'hạt mè', 'hạt kê', 'hạt gạo', 
      'hạt lúa', 'hạt bụi', 'hạt cát', 'hạt mưa', 'hạt nhãn', 'hạt xoài', 'hạt vải', 
      'hạt mít', 'hạt chanh', 'hạt bưởi', 'hạt cam', 'hạt hồng xiêm', 'hạt na', 'hạt mận', 
      'hạt đào', 'hạt táo', 'hạt mơ', 'hạt sầu riêng', 'hạt nhân', 'hạt giống', 'hạt nêm', 
      'hạt nổ', 'hạt mạng', 'hạt trần', 'hạt kín', 'hạt dẻ cười', 'hạt tiêu lốt', 
      'hạt macca', 'hạt mắc ca'
    ],
    'dại': [
      'dại khờ', 'dại dột', 'thơ dại', 'khờ dại', 'ngốc dại', 'ngu dại', 
      'làm dại', 'dại gì', 'dại mồm', 'dại miệng', 'dại tay', 'dại chân', 'dại mặt',
      'phát dại'
    ],
    'nấm': [
      'nấm lùn', 'nấm tuyết', 'nấm rơm', 'nấm linh chi', 'nấm hương', 'nấm đông cô', 
      'nấm bào ngư', 'nấm kim châm', 'nấm đùi gà', 'nấm mèo', 'nấm mộc nhĩ', 
      'nấm mộ', 'nấm mối', 'nấm men', 'nấm độc', 'nấm mỡ', 'nấm hải sản'
    ],
    'ghẻ': [
      'ghẻ lạnh', 'bố ghẻ', 'mẹ ghẻ', 'con ghẻ', 'chị ghẻ', 'anh ghẻ'
    ],
    've': [
      've sầu', 've vãn', 've vẩy', 've vuốt', 'con ve sầu'
    ],
    'hoạn': [
      'hoạn nạn', 'tai hoạn', 'hoạn quan', 'hoạn lộ', 'hoạn thư'
    ],
    'nôn': [
      'nôn nóng', 'nôn nao', 'nôn nả'
    ],
    'trớ': [
      'trớ trêu'
    ],
    'tắm': [
      'phòng tắm', 'bồn tắm', 'tắm nắng', 'tắm biển', 'tắm mưa', 'tắm táp'
    ],
    'rau': [
      'rau cháo', 'rau thai', 'nhau rau'
    ]
  };

  const vietnamesePattern = "a-zA-Z0-9ăâđêôơưàảãáạằằẳẵắặầẩẫấậèẻẽéẹềểễếệìỉĩíịòỏõóọồổỗốộờởỡớợùủũúụừửữứựỳỷỹýỵ";

  return rows.filter((row) => {
    if (!row.keyword) return false;
    const keywords = row.keyword.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean);
    
    return keywords.some((k) => {
      // 1. Kiểm tra nhanh xem câu có chứa từ khóa k không
      if (!lowerMsg.includes(k)) return false;

      // 2. Với các từ khóa không chứa khoảng trắng hoặc ngắn (<= 6 ký tự), áp dụng ranh giới từ tiếng Việt tự định nghĩa và lọc nhiễu cục bộ
      if (!k.includes(' ') || k.length <= 6) {
        const escapedK = k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regexPattern = `(?<=^|[^${vietnamesePattern}])${escapedK}(?=$|[^${vietnamesePattern}])`;
        const regex = new RegExp(regexPattern, 'gi');
        
        const matches = [...lowerMsg.matchAll(regex)];
        if (matches.length === 0) return false;

        // Nếu có danh sách loại trừ, kiểm tra xem có ít nhất một vị trí khớp nào không bị loại trừ
        if (exclusions[k]) {
          return matches.some((match) => {
            const matchIdx = match.index;
            const isExcluded = exclusions[k].some((ex) => {
              const exLower = ex.toLowerCase();
              let idxInEx = exLower.indexOf(k);
              while (idxInEx !== -1) {
                const startIdxInMsg = matchIdx - idxInEx;
                if (startIdxInMsg >= 0 && startIdxInMsg + exLower.length <= lowerMsg.length) {
                  const subStr = lowerMsg.substring(startIdxInMsg, startIdxInMsg + exLower.length);
                  if (subStr === exLower) {
                    return true; // Khớp tại vị trí này bị loại trừ
                  }
                }
                idxInEx = exLower.indexOf(k, idxInEx + 1);
              }
              return false;
            });
            return !isExcluded; // Vị trí này hợp lệ nếu không bị loại trừ
          });
        }
      }

      return true;
    });
  });
}

/**
 * Lists wiki entries with pagination and optional search
 */
export async function listWikiEntries(query = {}) {
  const { page, pageSize, offset } = paginationFromQuery(query);
  const conditions = [];
  const values = [];

  if (query.search) {
    conditions.push('(keyword LIKE ? OR content LIKE ?)');
    const keyword = `%${query.search}%`;
    values.push(keyword, keyword);
  }

  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const pool = getPool();
  const [countRows] = await pool.execute(`SELECT COUNT(*) AS total FROM chatbot_wiki ${whereSql}`, values);
  const [rows] = await pool.execute(
    `SELECT id, keyword, content, created_at, updated_at
     FROM chatbot_wiki
     ${whereSql}
     ORDER BY keyword ASC, id DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    values
  );

  return {
    entries: rows.map(r => ({
      id: Number(r.id),
      keyword: r.keyword,
      content: r.content,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null
    })),
    meta: buildPaginationMeta({ page, pageSize, totalItems: Number(countRows[0]?.total || 0) })
  };
}

/**
 * Gets a single wiki entry by ID
 */
export async function getWikiEntry(id) {
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT id, keyword, content, created_at, updated_at
     FROM chatbot_wiki
     WHERE id = ? LIMIT 1`,
    [id]
  );
  const row = rows[0];
  if (!row) throw notFoundError('Wiki entry was not found.', 'WIKI_ENTRY_NOT_FOUND');

  return {
    id: Number(row.id),
    keyword: row.keyword,
    content: row.content,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null
  };
}

/**
 * Creates a new wiki entry
 */
export async function createWikiEntry(input, context = {}) {
  const { keyword, content } = input;
  const pool = getPool();

  // Check unique keyword
  const [dupes] = await pool.execute('SELECT id FROM chatbot_wiki WHERE keyword = ? LIMIT 1', [keyword]);
  if (dupes.length) throw conflictError('Keyword already exists in wiki.', 'WIKI_KEYWORD_ALREADY_EXISTS');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `INSERT INTO chatbot_wiki (keyword, content, created_at, updated_at)
       VALUES (?, ?, NOW(), NOW())`,
      [keyword, content]
    );
    const insertId = result.insertId;

    await writeAuditLog({
      actorUserId: context.actorUserId,
      action: 'admin.chatbot_wiki.create',
      targetType: 'chatbot_wiki',
      targetId: String(insertId),
      payload: { keyword },
      clientIp: context.clientIp,
      userAgent: context.userAgent,
      connection
    });

    await connection.commit();
    return {
      id: Number(insertId),
      keyword,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Updates an existing wiki entry
 */
export async function updateWikiEntry(id, input, context = {}) {
  const pool = getPool();
  const [rows] = await pool.execute('SELECT id, keyword, content FROM chatbot_wiki WHERE id = ? LIMIT 1', [id]);
  const row = rows[0];
  if (!row) throw notFoundError('Wiki entry was not found.', 'WIKI_ENTRY_NOT_FOUND');

  const keyword = input.keyword !== undefined ? input.keyword : row.keyword;
  const content = input.content !== undefined ? input.content : row.content;

  if (input.keyword && input.keyword !== row.keyword) {
    const [dupes] = await pool.execute('SELECT id FROM chatbot_wiki WHERE keyword = ? AND id <> ? LIMIT 1', [input.keyword, id]);
    if (dupes.length) throw conflictError('Keyword already exists in wiki.', 'WIKI_KEYWORD_ALREADY_EXISTS');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute(
      `UPDATE chatbot_wiki SET keyword = ?, content = ?, updated_at = NOW() WHERE id = ?`,
      [keyword, content, id]
    );

    await writeAuditLog({
      actorUserId: context.actorUserId,
      action: 'admin.chatbot_wiki.update',
      targetType: 'chatbot_wiki',
      targetId: String(id),
      payload: { updatedFields: Object.keys(input) },
      clientIp: context.clientIp,
      userAgent: context.userAgent,
      connection
    });

    await connection.commit();
    return getWikiEntry(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Deletes a wiki entry
 */
export async function deleteWikiEntry(id, context = {}) {
  const pool = getPool();
  const [rows] = await pool.execute('SELECT id, keyword FROM chatbot_wiki WHERE id = ? LIMIT 1', [id]);
  const row = rows[0];
  if (!row) throw notFoundError('Wiki entry was not found.', 'WIKI_ENTRY_NOT_FOUND');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute('DELETE FROM chatbot_wiki WHERE id = ?', [id]);

    await writeAuditLog({
      actorUserId: context.actorUserId,
      action: 'admin.chatbot_wiki.delete',
      targetType: 'chatbot_wiki',
      targetId: String(id),
      payload: { keyword: row.keyword },
      clientIp: context.clientIp,
      userAgent: context.userAgent,
      connection
    });

    await connection.commit();
    return { success: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Normalizes entity name to Capital Case (e.g. 'Milo', 'Bo') or 'general'
 * @param {string} name
 * @returns {string}
 */
function normalizeEntityName(name) {
  const trimmed = (name || 'general').trim();
  if (trimmed.toLowerCase() === 'general') return 'general';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

const ALLOWED_MEMORY_KEYS = ['kibble_description', 'pet_breed', 'pet_weight_kg', 'user_preferences'];

/**
 * Retrieves all chatbot memories for a user
 * @param {number} userId
 * @returns {Promise<Array>} List of user memories
 */
export async function getUserMemories(userId) {
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT entity_name, memory_key, memory_value
     FROM chatbot_user_memories
     WHERE user_id = ?
     ORDER BY entity_name ASC, memory_key ASC`,
    [userId]
  );
  return rows.map(r => ({
    entityName: normalizeEntityName(r.entity_name),
    key: r.memory_key.trim().toLowerCase(),
    value: r.memory_value
  }));
}

/**
 * Saves or updates a chatbot memory entry for a user
 * @param {number} userId
 * @param {Object} params
 * @param {string} params.entityName
 * @param {string} params.key
 * @param {string} params.value
 * @returns {Promise<Object>} Success status
 */
export async function saveUserMemory(userId, { entityName, key, value }) {
  const pool = getPool();
  const normalizedEntity = normalizeEntityName(entityName);
  const normalizedKey = key.trim().toLowerCase();

  if (!ALLOWED_MEMORY_KEYS.includes(normalizedKey)) {
    throw new Error(`Invalid memory key: ${key}. Allowed keys are: ${ALLOWED_MEMORY_KEYS.join(', ')}`);
  }

  await pool.execute(
    `INSERT INTO chatbot_user_memories (user_id, entity_name, memory_key, memory_value, created_at, updated_at)
     VALUES (?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE memory_value = ?, updated_at = NOW()`,
    [userId, normalizedEntity, normalizedKey, value, value]
  );

  return { success: true };
}

/**
 * Deletes a chatbot memory entry for a user
 * @param {number} userId
 * @param {Object} params
 * @param {string} params.entityName
 * @param {string} params.key
 * @returns {Promise<Object>} Success status
 */
export async function deleteUserMemory(userId, { entityName, key }) {
  const pool = getPool();
  const normalizedEntity = normalizeEntityName(entityName);
  const normalizedKey = key.trim().toLowerCase();

  const [result] = await pool.execute(
    `DELETE FROM chatbot_user_memories
     WHERE user_id = ? AND entity_name = ? AND memory_key = ?`,
    [userId, normalizedEntity, normalizedKey]
  );

  return { success: true, affectedRows: result.affectedRows };
}

