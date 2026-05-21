/**
 * SSE Controller
 * Handles GET /v1/events/stream
 *
 * - Sets SSE headers
 * - Replays missed events via Last-Event-ID
 * - Registers client in SSEService
 * - Sends initial heartbeat
 * - Cleans up on disconnect
 */

import { sseService as defaultService } from '../services/sse.service.js';

/**
 * Factory để inject service (dễ test).
 */
export function createSSEHandler(service = defaultService) {
  return async function eventsStream(req, res) {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    const userId = req.user.id;
    const lastEventId = req.headers['last-event-id'] || null;

    // Register client first so future events are received
    service.addClient(userId, res);

    // Replay missed events if client provides Last-Event-ID
    if (lastEventId) {
      service.replayFrom(userId, lastEventId, res);
    }

    // Send initial heartbeat so client knows connection is alive
    service.broadcast(userId, 'heartbeat', { timestamp: new Date().toISOString() });

    // Cleanup on client disconnect
    req.on('close', () => {
      service.removeClient(userId, res);
    });
  };
}

// Default handler using singleton service
export const eventsStream = createSSEHandler();
