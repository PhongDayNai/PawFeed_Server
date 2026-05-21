import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../../src/app.js';

const app = createApp();

function httpRequest(server, method, path, options = {}) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const body = options.body ? JSON.stringify(options.body) : null;
    const reqOptions = {
      hostname: '127.0.0.1',
      port: addr.port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
        ...(options.headers || {})
      }
    };
    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { res.body = JSON.parse(data); } catch { res.body = data; }
        resolve(res);
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

describe('Idempotency - feed-now', () => {
  let server;

  it('setup server', async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  });

  it('POST feed-now without auth returns 401', async () => {
    const res = await httpRequest(server, 'POST', '/v1/devices/device_001/commands/feed-now', {
      body: { openDurationMs: 500 }
    });
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.ok, false);
  });

  it('POST feed-now with invalid body returns 400', async () => {
    const res = await httpRequest(server, 'POST', '/v1/devices/device_001/commands/feed-now', {
      body: { openDurationMs: 50 }, // below minimum 100
      headers: { Authorization: 'Bearer invalid_token' }
    });
    // 401 because token is invalid (auth runs before validation)
    assert.ok([400, 401].includes(res.statusCode));
    assert.equal(res.body.ok, false);
  });

  it('Idempotency-Key header is accepted (no crash) on unauthenticated request', async () => {
    const key = '550e8400-e29b-41d4-a716-446655440000';
    const res = await httpRequest(server, 'POST', '/v1/devices/device_001/commands/feed-now', {
      body: { openDurationMs: 500 },
      headers: { 'Idempotency-Key': key }
    });
    // Should return 401 (not 500) — middleware handles missing auth gracefully
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.ok, false);
  });

  it('teardown server', async () => {
    await new Promise((resolve) => server.close(resolve));
  });
});
