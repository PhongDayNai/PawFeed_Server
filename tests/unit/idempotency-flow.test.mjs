import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { IdempotencyService } from '../../src/services/idempotency.service.js';
import { createIdempotencyMiddleware } from '../../src/middleware/idempotency.js';

/**
 * Test the full idempotency flow:
 * middleware → controller stores result → duplicate request returns cached
 *
 * Keys are namespaced per user: `${userId}:${rawKey}`
 */

function makeReq(idempotencyKey = null, userId = 1) {
  return {
    headers: idempotencyKey ? { 'idempotency-key': idempotencyKey } : {},
    idempotencyKey: null,
    params: { deviceId: 'feeder001' },
    user: { id: userId },
    body: { openDurationMs: 500 }
  };
}

function makeRes() {
  const res = {
    _status: 200,
    _body: null,
    status(code) { this._status = code; return this; },
    json(body) { this._body = body; return this; }
  };
  return res;
}

describe('idempotency full flow', () => {
  let service;
  let middleware;

  beforeEach(() => {
    service = new IdempotencyService();
    middleware = createIdempotencyMiddleware(service);
  });

  it('first request passes through, second returns cached', async () => {
    const rawKey = 'flow-test-key-001';
    const userId = 1;
    const namespacedKey = `${userId}:${rawKey}`;

    // --- First request ---
    const req1 = makeReq(rawKey, userId);
    const res1 = makeRes();
    let next1Called = false;

    await middleware(req1, res1, () => { next1Called = true; });

    assert.ok(next1Called, 'first request: next() should be called');
    assert.equal(req1.idempotencyKey, namespacedKey);

    // Simulate controller storing result after processing (uses namespaced key)
    const commandResult = { requestId: 'req_abc123', status: 'queued' };
    await service.store(namespacedKey, commandResult, 202);

    // --- Second request (duplicate) ---
    const req2 = makeReq(rawKey, userId);
    const res2 = makeRes();
    let next2Called = false;

    await middleware(req2, res2, () => { next2Called = true; });

    assert.ok(!next2Called, 'second request: next() should NOT be called');
    assert.equal(res2._status, 202);
    assert.equal(res2._body.ok, true);
    assert.equal(res2._body.requestId, 'req_abc123');
    assert.equal(res2._body.cached, true);
  });

  it('different keys are independent', async () => {
    const userId = 1;
    const key1 = 'independent-key-A';
    const key2 = 'independent-key-B';

    // Store result for namespaced key1
    await service.store(`${userId}:${key1}`, { requestId: 'req_A' }, 202);

    // key2 should still pass through
    const req = makeReq(key2, userId);
    const res = makeRes();
    let nextCalled = false;
    await middleware(req, res, () => { nextCalled = true; });

    assert.ok(nextCalled, 'different key should pass through');
    assert.equal(req.idempotencyKey, `${userId}:${key2}`);
  });

  it('same raw key from different users are independent (isolation)', async () => {
    const rawKey = 'same-raw-key';
    const user1Id = 1;
    const user2Id = 2;

    // User1 stores result
    await service.store(`${user1Id}:${rawKey}`, { requestId: 'req_user1' }, 202);

    // User2 with same raw key should pass through (not get user1's cache)
    const req2 = makeReq(rawKey, user2Id);
    const res2 = makeRes();
    let next2Called = false;
    await middleware(req2, res2, () => { next2Called = true; });

    assert.ok(next2Called, 'user2 should pass through (different namespace)');
    assert.equal(req2.idempotencyKey, `${user2Id}:${rawKey}`);
  });

  it('no key = always passes through (no idempotency)', async () => {
    for (let i = 0; i < 2; i++) {
      const req = makeReq(null);
      const res = makeRes();
      let nextCalled = false;
      await middleware(req, res, () => { nextCalled = true; });
      assert.ok(nextCalled, `call ${i + 1}: next() should be called`);
    }
  });
});
