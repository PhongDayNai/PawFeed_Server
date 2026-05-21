import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SSEService } from '../../src/services/sse.service.js';

// Simulate a response stream
function makeRes() {
  const written = [];
  return {
    _written: written,
    _ended: false,
    write(data) { written.push(data); return true; },
    end() { this._ended = true; },
    setHeader() {},
    on() {},
    flush() {}
  };
}

describe('SSEService', () => {
  let service;

  beforeEach(() => {
    service = new SSEService();
  });

  describe('client management', () => {
    it('adds a client connection', () => {
      const res = makeRes();
      service.addClient(1, res);
      assert.equal(service.clientCount(1), 1);
    });

    it('removes a client connection', () => {
      const res = makeRes();
      service.addClient(1, res);
      service.removeClient(1, res);
      assert.equal(service.clientCount(1), 0);
    });

    it('supports multiple clients for same user', () => {
      const res1 = makeRes();
      const res2 = makeRes();
      service.addClient(1, res1);
      service.addClient(1, res2);
      assert.equal(service.clientCount(1), 2);
    });

    it('isolates clients per user', () => {
      const res1 = makeRes();
      const res2 = makeRes();
      service.addClient(1, res1);
      service.addClient(2, res2);
      assert.equal(service.clientCount(1), 1);
      assert.equal(service.clientCount(2), 1);
    });
  });

  describe('broadcast()', () => {
    it('sends event to all clients of a user', () => {
      const res1 = makeRes();
      const res2 = makeRes();
      service.addClient(1, res1);
      service.addClient(1, res2);

      service.broadcast(1, 'device_status_updated', { deviceId: 'feeder001', online: true });

      assert.ok(res1._written.length > 0, 'res1 should receive event');
      assert.ok(res2._written.length > 0, 'res2 should receive event');
    });

    it('does NOT send to other users', () => {
      const res1 = makeRes();
      const res2 = makeRes();
      service.addClient(1, res1);
      service.addClient(2, res2);

      service.broadcast(1, 'device_status_updated', { deviceId: 'feeder001', online: true });

      assert.ok(res1._written.length > 0, 'user1 should receive event');
      assert.equal(res2._written.length, 0, 'user2 should NOT receive event');
    });

    it('sends nothing when user has no clients', () => {
      // No clients added, should not throw
      assert.doesNotThrow(() => {
        service.broadcast(999, 'heartbeat', { timestamp: new Date().toISOString() });
      });
    });
  });

  describe('SSE event format', () => {
    it('formats event with id, event, data fields', () => {
      const res = makeRes();
      service.addClient(1, res);

      service.broadcast(1, 'heartbeat', { timestamp: '2026-05-21T00:00:00.000Z' });

      const raw = res._written.join('');
      assert.ok(raw.includes('id:'), 'should have id field');
      assert.ok(raw.includes('event: heartbeat'), 'should have event field');
      assert.ok(raw.includes('data:'), 'should have data field');
      assert.ok(raw.includes('2026-05-21T00:00:00.000Z'), 'should have payload data');
      // SSE events end with double newline
      assert.ok(raw.endsWith('\n\n'), 'should end with double newline');
    });

    it('data field contains valid JSON', () => {
      const res = makeRes();
      service.addClient(1, res);

      const payload = { deviceId: 'feeder001', online: true, lastSeen: '2026-05-21T00:00:00.000Z' };
      service.broadcast(1, 'device_status_updated', payload);

      const raw = res._written.join('');
      const dataLine = raw.split('\n').find(l => l.startsWith('data:'));
      assert.ok(dataLine, 'should have data line');
      const json = JSON.parse(dataLine.replace('data: ', ''));
      assert.deepEqual(json, payload);
    });

    it('event IDs are sequential', () => {
      const res = makeRes();
      service.addClient(1, res);

      service.broadcast(1, 'heartbeat', { timestamp: 'ts1' });
      service.broadcast(1, 'heartbeat', { timestamp: 'ts2' });

      const raw = res._written.join('');
      const idLines = raw.split('\n').filter(l => l.startsWith('id:'));
      assert.equal(idLines.length, 2);
      // IDs should be different
      assert.notEqual(idLines[0], idLines[1]);
    });
  });

  describe('specific event emitters', () => {
    it('emitDeviceStatusUpdated sends device_status_updated event', () => {
      const res = makeRes();
      service.addClient(1, res);

      service.emitDeviceStatusUpdated(1, 'feeder001', true, '2026-05-21T00:00:00.000Z');

      const raw = res._written.join('');
      assert.ok(raw.includes('event: device_status_updated'));
      assert.ok(raw.includes('feeder001'));
    });

    it('emitCommandUpdated sends command_updated event', () => {
      const res = makeRes();
      service.addClient(1, res);

      service.emitCommandUpdated(1, 'req_abc', 'feeder001', 'completed', 'feed_once');

      const raw = res._written.join('');
      assert.ok(raw.includes('event: command_updated'));
      assert.ok(raw.includes('req_abc'));
    });

    it('emitFeedingCompleted sends feeding_completed event', () => {
      const res = makeRes();
      service.addClient(1, res);

      service.emitFeedingCompleted(1, 'feeder001', 'req_abc', 500, '2026-05-21T00:00:00.000Z');

      const raw = res._written.join('');
      assert.ok(raw.includes('event: feeding_completed'));
      assert.ok(raw.includes('feeder001'));
    });

    it('emitConfigApplied sends config_applied event', () => {
      const res = makeRes();
      service.addClient(1, res);

      service.emitConfigApplied(1, 'feeder001', 'cfg_001', 5);

      const raw = res._written.join('');
      assert.ok(raw.includes('event: config_applied'));
      assert.ok(raw.includes('cfg_001'));
    });

    it('emitDeviceError sends device_error event', () => {
      const res = makeRes();
      service.addClient(1, res);

      service.emitDeviceError(1, 'feeder001', 'wifi_disconnected', 'Lost WiFi');

      const raw = res._written.join('');
      assert.ok(raw.includes('event: device_error'));
      assert.ok(raw.includes('wifi_disconnected'));
    });

    it('emitHeartbeat sends heartbeat to all users', () => {
      const res1 = makeRes();
      const res2 = makeRes();
      service.addClient(1, res1);
      service.addClient(2, res2);

      service.emitHeartbeat();

      assert.ok(res1._written.join('').includes('event: heartbeat'));
      assert.ok(res2._written.join('').includes('event: heartbeat'));
    });
  });
});
