import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { IdempotencyService } from '../../src/services/idempotency.service.js';

// Test the middleware logic directly (without Express)
// We simulate req/res/next pattern

function makeReq(idempotencyKey = null, userId = 1) {
  return {
    headers: idempotencyKey ? { 'idempotency-key': idempotencyKey } : {},
    idempotencyKey: null,
    user: { id: userId }
  };
}

function makeRes() {
  const res = {
    _status: null,
    _body: null,
    status(code) { this._status = code; return this; },
    json(body) { this._body = body; return this; }
  };
  return res;
}

// Import the middleware factory
import { createIdempotencyMiddleware } from '../../src/middleware/idempotency.js';

describe('idempotency middleware', () => {
  let service;
  let middleware;

  beforeEach(() => {
    service = new IdempotencyService();
    middleware = createIdempotencyMiddleware(service);
  });

  it('calls next() when no Idempotency-Key header', async () => {
    const req = makeReq();
    const res = makeRes();
    let nextCalled = false;
    await middleware(req, res, () => { nextCalled = true; });
    assert.ok(nextCalled, 'next() should be called');
    assert.equal(req.idempotencyKey, null);
  });

  it('calls next() and sets req.idempotencyKey on first request', async () => {
    const req = makeReq('test-key-001', 1);
    const res = makeRes();
    let nextCalled = false;
    await middleware(req, res, () => { nextCalled = true; });
    assert.ok(nextCalled, 'next() should be called for new key');
    assert.equal(req.idempotencyKey, '1:test-key-001');
  });

  it('returns cached response and does NOT call next() on duplicate key', async () => {
    // Pre-store a cached result using namespaced key
    await service.store('1:dup-key', { requestId: 'req_cached', status: 'queued' }, 202);

    const req = makeReq('dup-key', 1);
    const res = makeRes();
    let nextCalled = false;
    await middleware(req, res, () => { nextCalled = true; });

    assert.ok(!nextCalled, 'next() should NOT be called for duplicate key');
    assert.equal(res._status, 202);
    assert.ok(res._body.ok, 'response should have ok: true');
    assert.equal(res._body.requestId, 'req_cached');
    assert.equal(res._body.cached, true);
  });

  it('rejects invalid Idempotency-Key (too long)', async () => {
    const longKey = 'a'.repeat(256);
    const req = makeReq(longKey);
    const res = makeRes();
    let nextCalled = false;
    await middleware(req, res, () => { nextCalled = true; });

    assert.ok(!nextCalled, 'next() should NOT be called for invalid key');
    assert.equal(res._status, 400);
    assert.equal(res._body.ok, false);
    assert.equal(res._body.error.code, 'INVALID_IDEMPOTENCY_KEY');
  });

  it('isolates keys per user - user2 does NOT get user1 cached response', async () => {
    const key = 'shared-key-across-users';

    // User1 stores result with namespaced key
    const req1 = makeReq(key, 1);
    const res1 = makeRes();
    await middleware(req1, res1, () => {});
    // Simulate user1's result stored under namespaced key
    await service.store(req1.idempotencyKey, { requestId: 'req_user1' }, 202);

    // User2 uses same raw key but different userId
    const req2 = makeReq(key, 2);
    const res2 = makeRes();
    let next2Called = false;
    await middleware(req2, res2, () => { next2Called = true; });

    // User2 should NOT get user1's cached response
    assert.ok(next2Called, 'user2 should pass through (different namespace)');
    assert.notEqual(req2.idempotencyKey, req1.idempotencyKey, 'namespaced keys should differ');
  });
});
