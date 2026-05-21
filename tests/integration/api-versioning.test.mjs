import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';

const app = createApp();

function request(method, path) {
  return new Promise((resolve) => {
    const req = { method, url: path, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const res = {
      _status: 200,
      _headers: {},
      _body: '',
      status(code) { this._status = code; return this; },
      set(k, v) { this._headers[k] = v; return this; },
      redirect(code, location) {
        this._status = code;
        this._headers['location'] = location;
        resolve(this);
      },
      json(data) { this._body = data; resolve(this); },
      send(data) { this._body = data; resolve(this); }
    };
    app(req, res, () => { resolve(res); });
  });
}

// Use supertest-style via node http
import http from 'node:http';

function httpRequest(server, method, path, options = {}) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const reqOptions = {
      hostname: '127.0.0.1',
      port: addr.port,
      path,
      method,
      headers: options.headers || {}
    };
    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          res.body = JSON.parse(body);
        } catch {
          res.body = body;
        }
        resolve(res);
      });
    });
    req.on('error', reject);
    req.end();
  });
}

describe('API Versioning', () => {
  let server;

  it('setup server', async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  });

  it('GET /v1/health returns 200', async () => {
    const res = await httpRequest(server, 'GET', '/v1/health');
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
  });

  it('GET /api/health redirects 301 to /v1/health', async () => {
    const res = await httpRequest(server, 'GET', '/api/health');
    assert.equal(res.statusCode, 301);
    assert.ok(res.headers.location.includes('/v1/health'));
  });

  it('GET / returns service info', async () => {
    const res = await httpRequest(server, 'GET', '/');
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.ok(res.body.service);
  });

  it('GET /v1/nonexistent returns 404', async () => {
    const res = await httpRequest(server, 'GET', '/v1/nonexistent-route-xyz');
    assert.equal(res.statusCode, 404);
  });

  it('teardown server', async () => {
    await new Promise((resolve) => server.close(resolve));
  });
});
