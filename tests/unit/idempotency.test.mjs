import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Import the service we're about to build
import { IdempotencyService } from '../../src/services/idempotency.service.js';

describe('IdempotencyService', () => {
  let service;

  beforeEach(() => {
    service = new IdempotencyService();
  });

  describe('get()', () => {
    it('returns null for unknown key', async () => {
      const result = await service.get('nonexistent-key');
      assert.equal(result, null);
    });

    it('returns null for expired key', async () => {
      // Store with 0ms TTL (already expired)
      await service.store('expired-key', { requestId: 'req_123' }, 202, -1);
      const result = await service.get('expired-key');
      assert.equal(result, null);
    });
  });

  describe('store()', () => {
    it('stores result and retrieves it', async () => {
      const payload = { requestId: 'req_abc123', status: 'queued' };
      await service.store('key-001', payload, 202);

      const cached = await service.get('key-001');
      assert.ok(cached, 'should return cached entry');
      assert.equal(cached.statusCode, 202);
      assert.deepEqual(cached.result, payload);
      assert.ok(cached.processedAt, 'should have processedAt');
    });

    it('stores different keys independently', async () => {
      await service.store('key-A', { requestId: 'req_A' }, 202);
      await service.store('key-B', { requestId: 'req_B' }, 202);

      const a = await service.get('key-A');
      const b = await service.get('key-B');

      assert.equal(a.result.requestId, 'req_A');
      assert.equal(b.result.requestId, 'req_B');
    });

    it('does not overwrite existing key', async () => {
      await service.store('key-dup', { requestId: 'req_first' }, 202);
      await service.store('key-dup', { requestId: 'req_second' }, 202);

      const cached = await service.get('key-dup');
      assert.equal(cached.result.requestId, 'req_first');
    });
  });

  describe('checkAndGet()', () => {
    it('returns null on first call (not cached)', async () => {
      const result = await service.checkAndGet('new-key');
      assert.equal(result, null);
    });

    it('returns cached entry on second call with same key', async () => {
      await service.store('repeat-key', { requestId: 'req_xyz' }, 202);
      const cached = await service.checkAndGet('repeat-key');
      assert.ok(cached);
      assert.equal(cached.result.requestId, 'req_xyz');
    });
  });

  describe('TTL behavior', () => {
    it('valid key within TTL is returned', async () => {
      await service.store('ttl-key', { requestId: 'req_ttl' }, 202, 60 * 60 * 1000); // 1h
      const cached = await service.get('ttl-key');
      assert.ok(cached);
    });

    it('expired key returns null', async () => {
      await service.store('expired-key-2', { requestId: 'req_exp' }, 202, -1000); // already expired
      const cached = await service.get('expired-key-2');
      assert.equal(cached, null);
    });
  });
});
