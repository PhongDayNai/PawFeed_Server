import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SSEService } from '../../src/services/sse.service.js';

function makeRes() {
  const written = [];
  return {
    _written: written,
    write(data) { written.push(data); return true; },
    end() {},
    setHeader() {},
    on() {},
    flush() {}
  };
}

describe('SSEService - event buffer and replay', () => {
  let service;

  beforeEach(() => {
    service = new SSEService();
  });

  it('buffers events per user', () => {
    const res = makeRes();
    service.addClient(1, res);
    service.broadcast(1, 'heartbeat', { timestamp: 'ts1' });
    service.broadcast(1, 'heartbeat', { timestamp: 'ts2' });

    const buffer = service.getBuffer(1);
    assert.equal(buffer.length, 2);
  });

  it('getBuffer returns empty array for user with no events', () => {
    const buffer = service.getBuffer(999);
    assert.deepEqual(buffer, []);
  });

  it('replays events after given eventId on reconnect', () => {
    const res1 = makeRes();
    service.addClient(1, res1);

    // Broadcast 3 events
    service.broadcast(1, 'heartbeat', { timestamp: 'ts1' });
    service.broadcast(1, 'heartbeat', { timestamp: 'ts2' });
    service.broadcast(1, 'heartbeat', { timestamp: 'ts3' });

    // Get IDs from buffer
    const buffer = service.getBuffer(1);
    assert.equal(buffer.length, 3);
    const firstId = buffer[0].id;
    const secondId = buffer[1].id;

    // New client reconnects with Last-Event-ID = firstId
    const res2 = makeRes();
    service.replayFrom(1, firstId, res2);

    // Should receive events after firstId (ts2 and ts3)
    const raw = res2._written.join('');
    assert.ok(raw.includes('ts2'), 'should replay ts2');
    assert.ok(raw.includes('ts3'), 'should replay ts3');
    assert.ok(!raw.includes('ts1'), 'should NOT replay ts1 (already seen)');
  });

  it('replayFrom with unknown lastEventId replays nothing', () => {
    const res1 = makeRes();
    service.addClient(1, res1);
    service.broadcast(1, 'heartbeat', { timestamp: 'ts1' });

    const res2 = makeRes();
    service.replayFrom(1, 'evt_nonexistent_999', res2);

    // Unknown ID → no replay (safe fallback)
    assert.equal(res2._written.length, 0);
  });

  it('replayFrom with null lastEventId replays nothing', () => {
    const res1 = makeRes();
    service.addClient(1, res1);
    service.broadcast(1, 'heartbeat', { timestamp: 'ts1' });

    const res2 = makeRes();
    service.replayFrom(1, null, res2);
    assert.equal(res2._written.length, 0);
  });

  it('buffer is capped at MAX_BUFFER_SIZE events per user', () => {
    const res = makeRes();
    service.addClient(1, res);

    // Broadcast more than MAX_BUFFER_SIZE events
    for (let i = 0; i < 110; i++) {
      service.broadcast(1, 'heartbeat', { timestamp: `ts${i}` });
    }

    const buffer = service.getBuffer(1);
    assert.ok(buffer.length <= 100, `buffer should be capped at 100, got ${buffer.length}`);
  });

  it('buffer is isolated per user', () => {
    const res1 = makeRes();
    const res2 = makeRes();
    service.addClient(1, res1);
    service.addClient(2, res2);

    service.broadcast(1, 'heartbeat', { timestamp: 'user1-ts' });
    service.broadcast(2, 'heartbeat', { timestamp: 'user2-ts' });

    assert.equal(service.getBuffer(1).length, 1);
    assert.equal(service.getBuffer(2).length, 1);
    assert.ok(service.getBuffer(1)[0].data.timestamp === 'user1-ts');
    assert.ok(service.getBuffer(2)[0].data.timestamp === 'user2-ts');
  });
});
