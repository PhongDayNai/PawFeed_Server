import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SSEService } from '../../src/services/sse.service.js';
import { createSSEHandler } from '../../src/controllers/sse.controller.js';

function makeReq(userId = 1, lastEventId = null) {
  const listeners = {};
  return {
    user: { id: userId },
    headers: lastEventId ? { 'last-event-id': lastEventId } : {},
    on(event, cb) { listeners[event] = cb; },
    _emit(event) { if (listeners[event]) listeners[event](); },
    _listeners: listeners
  };
}

function makeRes() {
  const headers = {};
  const written = [];
  return {
    _headers: headers,
    _written: written,
    _ended: false,
    setHeader(k, v) { headers[k] = v; },
    write(data) { written.push(data); return true; },
    end() { this._ended = true; },
    flush() {},
    on() {}
  };
}

describe('SSE controller', () => {
  let service;
  let handler;

  beforeEach(() => {
    service = new SSEService();
    handler = createSSEHandler(service);
  });

  it('sets correct SSE headers', async () => {
    const req = makeReq(1);
    const res = makeRes();
    await handler(req, res);

    assert.equal(res._headers['Content-Type'], 'text/event-stream');
    assert.equal(res._headers['Cache-Control'], 'no-cache');
    assert.equal(res._headers['Connection'], 'keep-alive');
    assert.equal(res._headers['X-Accel-Buffering'], 'no');
  });

  it('registers client on connection', async () => {
    const req = makeReq(1);
    const res = makeRes();
    await handler(req, res);

    assert.equal(service.clientCount(1), 1);
  });

  it('removes client on disconnect', async () => {
    const req = makeReq(1);
    const res = makeRes();
    await handler(req, res);

    assert.equal(service.clientCount(1), 1);

    // Simulate client disconnect
    req._emit('close');

    assert.equal(service.clientCount(1), 0);
  });

  it('sends initial heartbeat on connect', async () => {
    const req = makeReq(1);
    const res = makeRes();
    await handler(req, res);

    const raw = res._written.join('');
    assert.ok(raw.includes('event: heartbeat'), 'should send initial heartbeat');
  });

  it('isolates clients per user', async () => {
    const req1 = makeReq(1);
    const res1 = makeRes();
    const req2 = makeReq(2);
    const res2 = makeRes();

    await handler(req1, res1);
    await handler(req2, res2);

    assert.equal(service.clientCount(1), 1);
    assert.equal(service.clientCount(2), 1);

    // Broadcast to user1 only
    service.broadcast(1, 'heartbeat', { timestamp: 'ts' });

    // res1 has initial heartbeat + broadcast = 2 writes
    // res2 has only initial heartbeat = 1 write
    assert.ok(res1._written.length > res2._written.length);
  });
});
