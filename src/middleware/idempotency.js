/**
 * Idempotency Middleware
 * Kiểm tra Idempotency-Key header:
 * - Không có key → next() bình thường
 * - Key hợp lệ, chưa có cache → set req.idempotencyKey, next()
 * - Key hợp lệ, đã có cache → trả về cached response, không gọi next()
 * - Key không hợp lệ (quá dài) → 400
 */

import { idempotencyService as defaultService } from '../services/idempotency.service.js';
import { errorResponse } from '../utils/response.js';

const MAX_KEY_LENGTH = 255;

/**
 * Factory để inject service (dễ test).
 */
export function createIdempotencyMiddleware(service = defaultService) {
  return async function idempotencyMiddleware(req, res, next) {
    const key = req.headers['idempotency-key'];

    // Không có key → không enforce idempotency
    if (!key) {
      req.idempotencyKey = null;
      return next();
    }

    // Validate key length
    if (key.length > MAX_KEY_LENGTH) {
      return res.status(400).json(errorResponse({
        code: 'INVALID_IDEMPOTENCY_KEY',
        message: `Idempotency-Key must be at most ${MAX_KEY_LENGTH} characters.`
      }));
    }

    // Namespace key theo userId để isolate per user (security)
    const userId = req.user?.id;
    const namespacedKey = userId ? `${userId}:${key}` : key;

    // Check cache
    const cached = await service.checkAndGet(namespacedKey);
    if (cached) {
      return res.status(cached.statusCode).json({
        ok: true,
        ...cached.result,
        cached: true
      });
    }

    // Key mới, chưa có cache → gắn vào req để controller dùng sau
    req.idempotencyKey = namespacedKey;
    return next();
  };
}

// Default middleware instance dùng singleton service
export const idempotencyMiddleware = createIdempotencyMiddleware();
