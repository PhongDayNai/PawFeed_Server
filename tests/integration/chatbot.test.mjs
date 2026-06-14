import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import axios from 'axios';
import { createApp } from '../../src/app.js';
import { getPool } from '../../src/config/db.js';
import { createAccessToken } from '../../src/utils/token.js';

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

describe('Chatbot API Integration Tests', () => {
  let server;
  let originalAxiosPost;
  let originalPoolExecute;
  const mockUser = {
    id: 1,
    full_name: 'Test User',
    email: 'test@example.com',
    password_hash: 'hash',
    role: 'user',
    is_disabled: 0
  };

  it('setup server and mock db/axios', async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

    // Mock DB pool.execute
    const pool = getPool();
    originalPoolExecute = pool.execute;
    pool.execute = async (sql, params) => {
      if (sql.includes('users') && sql.includes('id = ?')) {
        return [[mockUser]];
      }
      return [[]];
    };

    // Mock axios.post
    originalAxiosPost = axios.post;
  });

  it('POST /v1/chatbot without auth returns 401', async () => {
    const res = await httpRequest(server, 'POST', '/v1/chatbot', {
      body: {
        messages: [{ role: 'user', content: 'Hello' }]
      }
    });
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.ok, false);
    assert.equal(res.body.error.code, 'MISSING_BEARER_TOKEN');
  });

  it('POST /v1/chatbot with auth but empty messages returns 400', async () => {
    const token = createAccessToken(mockUser);
    const res = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        messages: []
      }
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.ok, false);
    assert.equal(res.body.error.code, 'INVALID_BODY');
  });

  it('POST /v1/chatbot with auth and valid body returns 200 with chatbot response', async () => {
    // Setup mock response for axios
    axios.post = async (url, data, config) => {
      assert.ok(url.includes('/chat/completions'));
      assert.equal(data.messages[0].content, 'Hello AI');
      return {
        data: {
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Hello Human! I am your pet feeding assistant.'
              }
            }
          ]
        }
      };
    };

    const token = createAccessToken(mockUser);
    const res = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        messages: [{ role: 'user', content: 'Hello AI' }]
      }
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.message.role, 'assistant');
    assert.equal(res.body.message.content, 'Hello Human! I am your pet feeding assistant.');
  });

  it('POST /v1/chatbot maps short model name to full model name', async () => {
    let sentModel = null;
    axios.post = async (url, data, config) => {
      sentModel = data.model;
      return {
        data: {
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Response with mapped model.'
              }
            }
          ]
        }
      };
    };

    const token = createAccessToken(mockUser);
    const res = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        model: 'gemma-4-e4b',
        messages: [{ role: 'user', content: 'Hello AI' }]
      }
    });

    assert.equal(res.statusCode, 200);
    assert.equal(sentModel, 'gemma-4-E4B-it-uncensored-heretic-Q4_K_M.gguf');
  });

  it('POST /v1/chatbot handles AI server error and returns 502', async () => {
    // Setup mock error for axios
    axios.post = async (url, data, config) => {
      const error = new Error('Connection refused');
      error.code = 'ECONNREFUSED';
      throw error;
    };

    const token = createAccessToken(mockUser);
    const res = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        messages: [{ role: 'user', content: 'Trigger error' }]
      }
    });

    assert.equal(res.statusCode, 502);
    assert.equal(res.body.ok, false);
    assert.equal(res.body.error.code, 'AI_SERVICE_ERROR');
  });

  it('teardown server and restore mocks', async () => {
    // Restore original methods
    const pool = getPool();
    pool.execute = originalPoolExecute;
    axios.post = originalAxiosPost;

    await new Promise((resolve) => server.close(resolve));
  });
});
