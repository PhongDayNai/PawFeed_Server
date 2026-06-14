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

  let mockChatMessages = [];

  it('setup server and mock db/axios', async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

    // Mock DB pool.execute
    const pool = getPool();
    originalPoolExecute = pool.execute;
    pool.execute = async (sql, params) => {
      const normalizedSql = sql.replace(/\s+/g, ' ');
      if (normalizedSql.includes('users') && normalizedSql.includes('id = ?')) {
        return [[mockUser]];
      }
      if (normalizedSql.includes('INSERT INTO chatbot_messages')) {
        mockChatMessages.push({
          id: mockChatMessages.length + 1,
          user_id: params[0],
          session_id: params[1],
          role: params[2],
          content: params[3],
          model: params[4],
          created_at: new Date()
        });
        return [{ insertId: mockChatMessages.length }];
      }
      if (normalizedSql.includes('FROM chatbot_messages')) {
        if (/\bLIMIT\s+1\b/i.test(normalizedSql)) {
          const last = mockChatMessages[mockChatMessages.length - 1];
          return [last ? [last] : []];
        }
        if (normalizedSql.includes('AND session_id = ?')) {
          const sessionId = params[1];
          const filtered = mockChatMessages.filter(m => m.user_id === params[0] && m.session_id === sessionId);
          return [filtered];
        }
        // General history query
        return [mockChatMessages];
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

  it('POST /v1/chatbot with auth and valid body returns 200 and stores history', async () => {
    mockChatMessages = []; // Reset history
    
    // Setup mock response for axios
    axios.post = async (url, data, config) => {
      assert.ok(url.includes('/chat/completions'));
      assert.equal(data.messages[0].role, 'system');
      assert.equal(data.messages[1].content, 'Hello AI');
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

    // Verify history contains 2 messages (user question + assistant answer)
    assert.equal(mockChatMessages.length, 2);
    assert.equal(mockChatMessages[0].role, 'user');
    assert.equal(mockChatMessages[0].content, 'Hello AI');
    assert.equal(mockChatMessages[1].role, 'assistant');
    assert.equal(mockChatMessages[1].content, 'Hello Human! I am your pet feeding assistant.');
  });

  it('POST /v1/chatbot maps short model name to full model name and saves to history', async () => {
    mockChatMessages = []; // Reset history
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
    
    // Verify mapped model name is stored in history
    assert.equal(mockChatMessages.length, 2);
    assert.equal(mockChatMessages[0].model, 'gemma-4-E4B-it-uncensored-heretic-Q4_K_M.gguf');
    assert.equal(mockChatMessages[1].model, 'gemma-4-E4B-it-uncensored-heretic-Q4_K_M.gguf');
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

  it('GET /v1/chatbot/history without auth returns 401', async () => {
    const res = await httpRequest(server, 'GET', '/v1/chatbot/history');
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.ok, false);
    assert.equal(res.body.error.code, 'MISSING_BEARER_TOKEN');
  });

  it('GET /v1/chatbot/history with auth returns chat history list', async () => {
    // Populate mock history
    mockChatMessages = [
      { id: 1, user_id: 1, role: 'user', content: 'Hello', model: 'gemma-4-e4b', created_at: new Date('2026-06-14T00:00:00Z') },
      { id: 2, user_id: 1, role: 'assistant', content: 'Hi there!', model: 'gemma-4-e4b', created_at: new Date('2026-06-14T00:00:01Z') }
    ];

    const token = createAccessToken(mockUser);
    const res = await httpRequest(server, 'GET', '/v1/chatbot/history?limit=10', {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.history.length, 2);
    assert.equal(res.body.history[0].role, 'user');
    assert.equal(res.body.history[0].content, 'Hello');
    assert.equal(res.body.history[1].role, 'assistant');
    assert.equal(res.body.history[1].content, 'Hi there!');
  });

  it('POST /v1/chatbot/init without auth returns 401', async () => {
    const res = await httpRequest(server, 'POST', '/v1/chatbot/init');
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.ok, false);
    assert.equal(res.body.error.code, 'MISSING_BEARER_TOKEN');
  });

  it('POST /v1/chatbot/init with auth handles session initialization and greeting logic', async () => {
    mockChatMessages = []; // Reset history
    const token = createAccessToken(mockUser);

    // Call 1: Empty DB -> should create a new session and return greeting
    const res1 = await httpRequest(server, 'POST', '/v1/chatbot/init', {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(res1.statusCode, 200);
    assert.equal(res1.body.ok, true);
    assert.equal(res1.body.isNewSession, true);
    assert.ok(res1.body.sessionId);
    assert.ok(res1.body.greeting);

    // Verify database has 1 greeting assistant message saved
    assert.equal(mockChatMessages.length, 1);
    assert.equal(mockChatMessages[0].role, 'assistant');
    assert.equal(mockChatMessages[0].content, res1.body.greeting);
    const sessionId1 = res1.body.sessionId;
    assert.equal(mockChatMessages[0].session_id, sessionId1);

    // Call 2: Within timeout -> should NOT create a new session and no greeting returned
    mockChatMessages[0].created_at = new Date();

    const res2 = await httpRequest(server, 'POST', '/v1/chatbot/init', {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(res2.statusCode, 200);
    assert.equal(res2.body.ok, true);
    assert.equal(res2.body.isNewSession, false);
    assert.equal(res2.body.sessionId, sessionId1);
    assert.equal(res2.body.greeting, undefined);
    assert.equal(mockChatMessages.length, 1); // No new message saved

    // Call 3: Exceeds timeout -> should create a new session and return greeting
    mockChatMessages[0].created_at = new Date(Date.now() - 4000 * 1000);

    const res3 = await httpRequest(server, 'POST', '/v1/chatbot/init', {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(res3.statusCode, 200);
    assert.equal(res3.body.ok, true);
    assert.equal(res3.body.isNewSession, true);
    assert.ok(res3.body.sessionId);
    assert.notEqual(res3.body.sessionId, sessionId1);
    assert.ok(res3.body.greeting);
    
    // Verify database has 2 messages now (the new greeting assistant message is saved)
    assert.equal(mockChatMessages.length, 2);
    assert.equal(mockChatMessages[1].role, 'assistant');
    assert.equal(mockChatMessages[1].content, res3.body.greeting);
    assert.equal(mockChatMessages[1].session_id, res3.body.sessionId);
  });

  it('implements time-based session auto-splitting and uses only active session history for AI context', async () => {
    mockChatMessages = []; // Reset history

    let aiReceivedMessagesList = [];
    axios.post = async (url, data, config) => {
      aiReceivedMessagesList.push(data.messages);
      return {
        data: {
          choices: [
            {
              message: {
                role: 'assistant',
                content: `Response to: ${data.messages[data.messages.length - 1].content}`
              }
            }
          ]
        }
      };
    };

    const token = createAccessToken(mockUser);

    // 1st Message (T0)
    const res1 = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        messages: [{ role: 'user', content: 'Message 1' }]
      }
    });
    assert.equal(res1.statusCode, 200);

    // Verify first session ID was created
    assert.equal(mockChatMessages.length, 2); // user + assistant
    const sessionId1 = mockChatMessages[0].session_id;
    assert.ok(sessionId1);
    assert.equal(mockChatMessages[1].session_id, sessionId1);

    // Mock first messages' time to be now to ensure the second message is within the 3600s window
    const t0 = new Date();
    mockChatMessages[0].created_at = t0;
    mockChatMessages[1].created_at = t0;

    // 2nd Message (T0 + 10 seconds)
    const res2 = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        messages: [
          { role: 'user', content: 'Message 1' },
          { role: 'user', content: 'Message 2' }
        ]
      }
    });
    assert.equal(res2.statusCode, 200);

    // Verify it reused the same session ID
    assert.equal(mockChatMessages.length, 4); // 4 messages total
    assert.equal(mockChatMessages[2].session_id, sessionId1);
    assert.equal(mockChatMessages[3].session_id, sessionId1);

    // 3rd Message (T0 + 4000 seconds -> exceeds 3600 seconds timeout)
    // Manually shift the timestamp of the last message (index 3) to 4000s in the past.
    mockChatMessages[3].created_at = new Date(Date.now() - 4000 * 1000);

    const res3 = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        messages: [
          { role: 'user', content: 'Message 1' },
          { role: 'user', content: 'Message 2' },
          { role: 'user', content: 'Message 3' }
        ]
      }
    });
    assert.equal(res3.statusCode, 200);

    // Verify a new session ID was created
    assert.equal(mockChatMessages.length, 6); // 6 messages total
    const sessionId2 = mockChatMessages[4].session_id;
    assert.ok(sessionId2);
    assert.notEqual(sessionId2, sessionId1);
    assert.equal(mockChatMessages[5].session_id, sessionId2);

    // Verify AI context only contains messages from the active session
    // Call 1: messages sent to AI should be: [SystemPrompt, User Message 1]
    assert.equal(aiReceivedMessagesList[0].length, 2);
    assert.equal(aiReceivedMessagesList[0][0].role, 'system');
    assert.equal(aiReceivedMessagesList[0][1].content, 'Message 1');

    // Call 2: messages sent to AI should be: [SystemPrompt, User Msg 1, Assistant Msg 1, User Msg 2] (since they belong to the same session)
    assert.equal(aiReceivedMessagesList[1].length, 4);
    assert.equal(aiReceivedMessagesList[1][0].role, 'system');
    assert.equal(aiReceivedMessagesList[1][1].content, 'Message 1');
    assert.equal(aiReceivedMessagesList[1][2].role, 'assistant');
    assert.equal(aiReceivedMessagesList[1][3].content, 'Message 2');

    // Call 3: messages sent to AI should be: [SystemPrompt, User Msg 3] (since Session 2 started, and we split context)
    assert.equal(aiReceivedMessagesList[2].length, 2);
    assert.equal(aiReceivedMessagesList[2][0].role, 'system');
    assert.equal(aiReceivedMessagesList[2][1].content, 'Message 3');
  });

  it('teardown server and restore mocks', async () => {
    // Restore original methods
    const pool = getPool();
    pool.execute = originalPoolExecute;
    axios.post = originalAxiosPost;

    await new Promise((resolve) => server.close(resolve));
  });
});
