/**
 * SSE Service
 * Quản lý SSE client connections và broadcast events.
 * Mỗi user có thể có nhiều connections (multiple tabs/devices).
 * Event buffer per user để support Last-Event-ID replay (max 100 events, TTL 5 min).
 *
 * Event format (SSE spec):
 *   id: evt_001\n
 *   event: device_status_updated\n
 *   data: {"deviceId":"feeder001","online":true}\n
 *   \n
 */

let eventCounter = 0;

const MAX_BUFFER_SIZE = 100;

function nextEventId() {
  return `evt_${++eventCounter}`;
}

function formatSSEEvent(id, eventType, payload) {
  return `id: ${id}\nevent: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export class SSEService {
  constructor() {
    // userId → Set<res>
    this._clients = new Map();
    // userId → Array<{id, eventType, data, ts}>
    this._buffers = new Map();
  }

  addClient(userId, res) {
    if (!this._clients.has(userId)) {
      this._clients.set(userId, new Set());
    }
    this._clients.get(userId).add(res);
  }

  removeClient(userId, res) {
    const set = this._clients.get(userId);
    if (!set) return;
    set.delete(res);
    if (set.size === 0) this._clients.delete(userId);
  }

  clientCount(userId) {
    return this._clients.get(userId)?.size ?? 0;
  }

  // --- Buffer management ---

  _appendToBuffer(userId, id, eventType, payload) {
    if (!this._buffers.has(userId)) {
      this._buffers.set(userId, []);
    }
    const buf = this._buffers.get(userId);
    buf.push({ id, eventType, data: payload, ts: Date.now() });
    // Cap buffer size
    if (buf.length > MAX_BUFFER_SIZE) {
      buf.splice(0, buf.length - MAX_BUFFER_SIZE);
    }
  }

  getBuffer(userId) {
    return this._buffers.get(userId) ?? [];
  }

  /**
   * Replay events after lastEventId to a specific res.
   * If lastEventId is unknown or null, replay nothing.
   */
  replayFrom(userId, lastEventId, res) {
    if (!lastEventId) return;
    const buf = this.getBuffer(userId);
    const idx = buf.findIndex(e => e.id === lastEventId);
    if (idx === -1) return; // unknown ID → no replay
    const toReplay = buf.slice(idx + 1);
    for (const entry of toReplay) {
      try {
        res.write(formatSSEEvent(entry.id, entry.eventType, entry.data));
        if (typeof res.flush === 'function') res.flush();
      } catch {
        // ignore write errors during replay
      }
    }
  }

  broadcast(userId, eventType, payload) {
    const id = nextEventId();
    // Always buffer (even if no clients connected right now)
    this._appendToBuffer(userId, id, eventType, payload);

    const set = this._clients.get(userId);
    if (!set || set.size === 0) return;
    const data = formatSSEEvent(id, eventType, payload);
    for (const res of set) {
      try {
        res.write(data);
        if (typeof res.flush === 'function') res.flush();
      } catch {
        set.delete(res);
      }
    }
  }

  // Broadcast to ALL connected users (e.g. heartbeat)
  broadcastAll(eventType, payload) {
    for (const userId of this._clients.keys()) {
      this.broadcast(userId, eventType, payload);
    }
  }

  // --- Specific event emitters ---

  emitDeviceStatusUpdated(userId, deviceId, online, lastSeen) {
    this.broadcast(userId, 'device_status_updated', { deviceId, online, lastSeen });
  }

  emitCommandUpdated(userId, requestId, deviceId, status, action) {
    this.broadcast(userId, 'command_updated', { requestId, deviceId, status, action });
  }

  emitFeedingCompleted(userId, deviceId, requestId, openDurationMs, completedAt) {
    this.broadcast(userId, 'feeding_completed', { deviceId, requestId, openDurationMs, completedAt });
  }

  emitConfigApplied(userId, deviceId, configId, version) {
    this.broadcast(userId, 'config_applied', { deviceId, configId, version });
  }

  emitDeviceError(userId, deviceId, error, details) {
    this.broadcast(userId, 'device_error', { deviceId, error, details });
  }

  emitHeartbeat() {
    this.broadcastAll('heartbeat', { timestamp: new Date().toISOString() });
  }
}

// Singleton instance
export const sseService = new SSEService();
