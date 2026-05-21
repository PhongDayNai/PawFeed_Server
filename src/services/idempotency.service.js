/**
 * Idempotency Service
 * In-memory store với TTL 24h.
 * Dùng cho feed-now và các mutation operations cần retry-safe.
 */

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class IdempotencyService {
  constructor() {
    this._store = new Map(); // key → { result, statusCode, processedAt, expiresAt }
  }

  /**
   * Lấy cached entry theo key. Trả về null nếu không tồn tại hoặc đã expired.
   */
  async get(key) {
    const entry = this._store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this._store.delete(key);
      return null;
    }
    return entry;
  }

  /**
   * Lưu result vào store. Không overwrite nếu key đã tồn tại.
   * @param {string} key
   * @param {object} result
   * @param {number} statusCode
   * @param {number} [ttlMs] - TTL in milliseconds, default 24h
   */
  async store(key, result, statusCode, ttlMs = DEFAULT_TTL_MS) {
    if (this._store.has(key)) return; // không overwrite
    this._store.set(key, {
      result,
      statusCode,
      processedAt: new Date().toISOString(),
      expiresAt: Date.now() + ttlMs
    });
  }

  /**
   * Alias cho get() — dùng trong middleware để check trước khi process.
   */
  async checkAndGet(key) {
    return this.get(key);
  }
}

// Singleton instance dùng trong toàn app
export const idempotencyService = new IdempotencyService();
