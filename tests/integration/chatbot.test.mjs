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

  const mockAdminUser = {
    id: 99,
    full_name: 'Test Admin',
    email: 'admin@example.com',
    password_hash: 'hash',
    role: 'admin',
    is_disabled: 0
  };

  let mockChatMessages = [];
  let mockUserMemories = [];
  let mockWikiEntries = [
    { id: 1, keyword: 'calibrate', content: 'Calibrate content here', created_at: new Date(), updated_at: new Date() },
    { id: 2, keyword: 'lượng ăn', content: 'Diet plan content here', created_at: new Date(), updated_at: new Date() },
    { id: 3, keyword: 'độc hại,độc,thức ăn độc,thực phẩm độc,không được ăn', content: 'Warning: Toxic food details.', created_at: new Date(), updated_at: new Date() },
    { id: 4, keyword: 'sốt ở chó mèo,sốt,nóng tai,nhiệt độ cao', content: 'Warning: Fever details.', created_at: new Date(), updated_at: new Date() },
    { id: 5, keyword: 'mèo bị giảm bạch cầu,fpv,viêm ruột truyền nhiễm mèo', content: 'Warning: FPV details.', created_at: new Date(), updated_at: new Date() }
  ];

  let originalPoolGetConnection;

  it('setup server and mock db/axios', async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

    // Mock DB pool.execute
    const pool = getPool();
    originalPoolExecute = pool.execute;
    originalPoolGetConnection = pool.getConnection;
    pool.execute = async (sql, params) => {
      const normalizedSql = sql.replace(/\s+/g, ' ');
      if (normalizedSql.includes('users') && normalizedSql.includes('id = ?')) {
        const id = params[0];
        if (Number(id) === 99) return [[mockAdminUser]];
        return [[mockUser]];
      }
      if (normalizedSql.includes('FROM devices') || normalizedSql.includes('FROM devices d')) {
        const deviceId = params[0];
        const userId = params[1];
        if (deviceId === 'feeder001') {
          return [[{
            id: 1,
            device_id: 'feeder001',
            machine_code: 'PF-ESP8266-001',
            display_name: 'Feeder Bơ',
            owner_user_id: userId,
            status: 'linked',
            online: 1
          }]];
        }
        return [[]];
      }
      if (normalizedSql.includes('INSERT INTO chatbot_messages')) {
        mockChatMessages.push({
          id: mockChatMessages.length + 1,
          user_id: params[0],
          session_id: params[1],
          role: params[2],
          content: params[3],
          model: params[4],
          created_at: new Date(),
          client_msg_id: params[6] || null
        });
        return [{ insertId: mockChatMessages.length }];
      }
      if (normalizedSql.includes('FROM chatbot_messages')) {
        if (normalizedSql.includes('client_msg_id = ?')) {
          const userId = params[0];
          const clientMsgId = params[1];
          const found = mockChatMessages.find(m => m.user_id === userId && m.client_msg_id === clientMsgId);
          return [found ? [found] : []];
        }
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
      // Wiki queries
      if (normalizedSql.includes('SELECT keyword, content FROM chatbot_wiki')) {
        return [mockWikiEntries];
      }
      if (normalizedSql.includes('SELECT COUNT(*) AS total FROM chatbot_wiki')) {
        let filtered = [...mockWikiEntries];
        if (params[0]) {
          const search = params[0].replace(/%/g, '').toLowerCase();
          filtered = filtered.filter(e => e.keyword.toLowerCase().includes(search) || e.content.toLowerCase().includes(search));
        }
        return [[{ total: filtered.length }]];
      }
      if (normalizedSql.includes('SELECT id, keyword, content, created_at, updated_at FROM chatbot_wiki') && !normalizedSql.includes('WHERE id = ?')) {
        let filtered = [...mockWikiEntries];
        if (params[0]) {
          const search = params[0].replace(/%/g, '').toLowerCase();
          filtered = filtered.filter(e => e.keyword.toLowerCase().includes(search) || e.content.toLowerCase().includes(search));
        }
        filtered.sort((a, b) => a.keyword.localeCompare(b.keyword));
        return [filtered];
      }
      if (normalizedSql.includes('SELECT') && normalizedSql.includes('FROM chatbot_wiki WHERE id = ?')) {
        const id = params[0];
        const entry = mockWikiEntries.find(e => e.id === Number(id));
        return [entry ? [entry] : []];
      }
      if (normalizedSql.includes('FROM chatbot_wiki WHERE keyword = ?')) {
        const keyword = params[0];
        const excludeId = params[1];
        const dup = mockWikiEntries.find(e => e.keyword.toLowerCase() === keyword.toLowerCase() && (!excludeId || e.id !== Number(excludeId)));
        return [dup ? [dup] : []];
      }
      if (normalizedSql.includes('INSERT INTO chatbot_wiki')) {
        const newEntry = {
          id: mockWikiEntries.length + 1,
          keyword: params[0],
          content: params[1],
          created_at: new Date(),
          updated_at: new Date()
        };
        mockWikiEntries.push(newEntry);
        return [{ insertId: newEntry.id }];
      }
      if (normalizedSql.includes('UPDATE chatbot_wiki SET')) {
        const keyword = params[0];
        const content = params[1];
        const id = params[2];
        const entry = mockWikiEntries.find(e => e.id === Number(id));
        if (entry) {
          entry.keyword = keyword;
          entry.content = content;
          entry.updated_at = new Date();
        }
        return [[]];
      }
      if (normalizedSql.includes('DELETE FROM chatbot_wiki WHERE id = ?')) {
        const id = params[0];
        mockWikiEntries = mockWikiEntries.filter(e => e.id !== Number(id));
        return [[]];
      }
      if (normalizedSql.startsWith('SELECT') && normalizedSql.includes('FROM chatbot_user_memories')) {
        return [mockUserMemories.filter(m => Number(m.user_id) === Number(params[0]))];
      }
      if (normalizedSql.includes('INSERT INTO chatbot_user_memories')) {
        const userId = params[0];
        const entityName = params[1];
        const memoryKey = params[2];
        const memoryValue = params[3];
        const valueForUpdate = params[4];
        
        const existing = mockUserMemories.find(m => Number(m.user_id) === Number(userId) && m.entity_name === entityName && m.memory_key === memoryKey);
        if (existing) {
          existing.memory_value = valueForUpdate;
        } else {
          mockUserMemories.push({
            user_id: userId,
            entity_name: entityName,
            memory_key: memoryKey,
            memory_value: memoryValue
          });
        }
        return [{ affectedRows: 1 }];
      }
      if (normalizedSql.includes('DELETE FROM chatbot_user_memories')) {
        const userId = params[0];
        const entityName = params[1];
        const memoryKey = params[2];
        const initialLength = mockUserMemories.length;
        mockUserMemories = mockUserMemories.filter(m => !(Number(m.user_id) === Number(userId) && m.entity_name === entityName && m.memory_key === memoryKey));
        return [{ affectedRows: initialLength - mockUserMemories.length }];
      }
      return [[]];
    };

    pool.getConnection = async () => {
      return {
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {},
        release: () => {},
        execute: pool.execute,
        query: pool.execute
      };
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

    // Call 3: Exceeds timeout but the only message is a greeting -> should NOT create a new session, but reuse the existing one
    mockChatMessages[0].created_at = new Date(Date.now() - 4000 * 1000);

    const res3 = await httpRequest(server, 'POST', '/v1/chatbot/init', {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(res3.statusCode, 200);
    assert.equal(res3.body.ok, true);
    assert.equal(res3.body.isNewSession, false);
    assert.equal(res3.body.sessionId, sessionId1);
    assert.equal(res3.body.greeting, undefined);
    assert.equal(mockChatMessages.length, 1); // No new message saved

    // Call 4: Add a user message to make the session have more than just a greeting
    mockChatMessages.push({
      id: mockChatMessages.length + 1,
      user_id: mockUser.id,
      session_id: sessionId1,
      role: 'user',
      content: 'Hello Nomi',
      model: 'gemma-4-e4b',
      created_at: new Date(Date.now() - 4000 * 1000)
    });

    // Call 5: Exceeds timeout and has a user message -> should create a new session and return greeting
    const res5 = await httpRequest(server, 'POST', '/v1/chatbot/init', {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(res5.statusCode, 200);
    assert.equal(res5.body.ok, true);
    assert.equal(res5.body.isNewSession, true);
    assert.ok(res5.body.sessionId);
    assert.notEqual(res5.body.sessionId, sessionId1);
    assert.ok(res5.body.greeting);

    // Verify database has 3 messages now (greeting, user message, new greeting message)
    assert.equal(mockChatMessages.length, 3);
    assert.equal(mockChatMessages[2].role, 'assistant');
    assert.equal(mockChatMessages[2].content, res5.body.greeting);
    assert.equal(mockChatMessages[2].session_id, res5.body.sessionId);

    // Call 6: Within timeout -> call with forceNewSession: true -> should create a new session and return greeting
    const res6 = await httpRequest(server, 'POST', '/v1/chatbot/init', {
      headers: { Authorization: `Bearer ${token}` },
      body: { forceNewSession: true }
    });
    assert.equal(res6.statusCode, 200);
    assert.equal(res6.body.ok, true);
    assert.equal(res6.body.isNewSession, true);
    assert.ok(res6.body.sessionId);
    assert.notEqual(res6.body.sessionId, res5.body.sessionId);
    assert.ok(res6.body.greeting);
    assert.equal(mockChatMessages.length, 4);
    assert.equal(mockChatMessages[3].role, 'assistant');
    assert.equal(mockChatMessages[3].content, res6.body.greeting);
    assert.equal(mockChatMessages[3].session_id, res6.body.sessionId);

    // Call 7: Validation check -> passing invalid value for forceNewSession should fail validation (Zod schema)
    const res7 = await httpRequest(server, 'POST', '/v1/chatbot/init', {
      headers: { Authorization: `Bearer ${token}` },
      body: { forceNewSession: "invalid" }
    });
    assert.equal(res7.statusCode, 400);
    assert.equal(res7.body.ok, false);
    assert.equal(res7.body.error.code, 'INVALID_BODY');
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

  it('implements function calling (tool use) for chatbot and processes mathematical calculations', async () => {
    mockChatMessages = []; // Reset history
    const token = createAccessToken(mockUser);

    let callCount = 0;
    let receivedTools = null;
    let finalPayloadSent = null;

    axios.post = async (url, data, config) => {
      callCount++;
      if (callCount === 1) {
        receivedTools = data.tools;
        // Mock response requesting tool call
        return {
          data: {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: null,
                  tool_calls: [
                    {
                      id: 'call_motor_1',
                      type: 'function',
                      function: {
                        name: 'calculateMotorRunTime',
                        arguments: JSON.stringify({ foodWeightGrams: 50, flowRateGramsPerSecond: 4.5 })
                      }
                    },
                    {
                      id: 'call_flow_1',
                      type: 'function',
                      function: {
                        name: 'calculateFlowRate',
                        arguments: JSON.stringify({ measuredWeightGrams: 45, testDurationMs: 10504 })
                      }
                    },
                    {
                      id: 'call_nutri_1',
                      type: 'function',
                      function: {
                        name: 'calculateDailyFoodRequirement',
                        arguments: JSON.stringify({ petType: 'cat', weightKg: 5, activityLevel: 'normal', ageGroup: 'adult' })
                      }
                    }
                  ]
                }
              }
            ]
          }
        };
      } else {
        finalPayloadSent = data.messages;
        return {
          data: {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: 'Dựa trên tính toán, thời gian chạy motor khoảng 12 giây, tốc độ dòng chảy thực tế là 4.5 g/s và nhu cầu ăn hàng ngày của mèo là 81g.'
                }
              }
            ]
          }
        };
      }
    };

    const res = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        messages: [{ role: 'user', content: 'Tính giúp tôi' }]
      }
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(callCount, 2);

    // Verify tools were supplied to AI
    assert.ok(receivedTools);
    assert.equal(receivedTools.length, 12);
    assert.equal(receivedTools[0].function.name, 'calculateMotorRunTime');
    assert.equal(receivedTools[1].function.name, 'calculateFlowRate');
    assert.equal(receivedTools[2].function.name, 'calculateDailyFoodRequirement');
    assert.equal(receivedTools[3].function.name, 'getUserDashboardOverview');
    assert.equal(receivedTools[4].function.name, 'getUserDevicesList');
    assert.equal(receivedTools[5].function.name, 'getUserDeviceDetail');
    assert.equal(receivedTools[6].function.name, 'proposeFeedNow');
    assert.equal(receivedTools[7].function.name, 'proposeSaveSchedule');

    // Verify tool results sent back to AI
    assert.ok(finalPayloadSent);
    // System + User + Assistant (with tool_calls) + 3 Tool responses
    assert.equal(finalPayloadSent.length, 6);
    
    // Assistant message requesting tool_calls
    const assistantMsg = finalPayloadSent[2];
    assert.equal(assistantMsg.role, 'assistant');
    assert.ok(assistantMsg.tool_calls);
    assert.equal(assistantMsg.tool_calls.length, 3);

    // Tool responses
    const toolMsg1 = finalPayloadSent[3];
    assert.equal(toolMsg1.role, 'tool');
    assert.equal(toolMsg1.tool_call_id, 'call_motor_1');
    const motorResult = JSON.parse(toolMsg1.content);
    assert.equal(motorResult.foodWeightGrams, 50);
    assert.equal(motorResult.estimatedFlowRate, 4.5);
    assert.equal(motorResult.motorDurationMs, 11615); // (50/4.5)*1000 + 504 = 11111 + 504 = 11615
    assert.equal(motorResult.clientDurationMs, 10607); // 11615 - 1008 = 10607
    assert.equal(motorResult.recommendedTimeSeconds, 12); // Math.round(11615 / 1000) = 12

    const toolMsg2 = finalPayloadSent[4];
    assert.equal(toolMsg2.role, 'tool');
    assert.equal(toolMsg2.tool_call_id, 'call_flow_1');
    const flowResult = JSON.parse(toolMsg2.content);
    assert.equal(flowResult.measuredWeightGrams, 45);
    assert.equal(flowResult.testDurationMs, 10504);
    assert.equal(flowResult.effectiveDurationMs, 10000);
    assert.equal(flowResult.flowRateGramsPerSecond, 4.5); // 45 / (10000 / 1000) = 4.5

    const toolMsg3 = finalPayloadSent[5];
    assert.equal(toolMsg3.role, 'tool');
    assert.equal(toolMsg3.tool_call_id, 'call_nutri_1');
    const nutriResult = JSON.parse(toolMsg3.content);
    assert.equal(nutriResult.petType, 'cat');
    assert.equal(nutriResult.restingEnergyRequirementKcal, 234); // 70 * (5)^0.75 = 234.05 = 234
    assert.equal(nutriResult.dailyEnergyRequirementKcal, 281); // 234.05 * 1.2 = 280.87 = 281
    assert.equal(nutriResult.recommendedDailyFoodGrams, 80); // (280.87 / 3500) * 1000 = 80.25 = 80

    // Verify DB only saves final assistant response
    assert.equal(mockChatMessages.length, 2);
    assert.equal(mockChatMessages[0].role, 'user');
    assert.equal(mockChatMessages[0].content, 'Tính giúp tôi');
    assert.equal(mockChatMessages[1].role, 'assistant');
    assert.equal(mockChatMessages[1].content, 'Dựa trên tính toán, thời gian chạy motor khoảng 12 giây, tốc độ dòng chảy thực tế là 4.5 g/s và nhu cầu ăn hàng ngày của mèo là 81g.');
  });

  it('POST /v1/chatbot detects missing deviceId in proposeFeedNow and forces AI self-correction', async () => {
    mockChatMessages = []; // Reset history
    const token = createAccessToken(mockUser);

    let callCount = 0;
    let finalPayloadSent = null;

    // Turn 1: AI calls getUserDevicesList to discover devices
    axios.post = async (url, data, config) => {
      return {
        data: {
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Tôi sẽ lấy danh sách máy.',
                tool_calls: [
                  {
                    id: 'call_list_test_1',
                    type: 'function',
                    function: {
                      name: 'getUserDevicesList',
                      arguments: '{}'
                    }
                  }
                ]
              }
            }
          ]
        }
      };
    };

    const res1 = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        messages: [{ role: 'user', content: 'Xem danh sách thiết bị' }]
      }
    });
    assert.equal(res1.statusCode, 200);

    // Turn 2: AI proposes feeding but leaves deviceId empty in loop 1, then self-corrects in loop 2
    axios.post = async (url, data, config) => {
      callCount++;
      if (callCount === 1) {
        // AI returns proposeFeedNow tool call but MISSING deviceId
        return {
          data: {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: 'Tôi sẽ đề xuất cho ăn.',
                  tool_calls: [
                    {
                      id: 'call_feed_missing_device',
                      type: 'function',
                      function: {
                        name: 'proposeFeedNow',
                        arguments: JSON.stringify({ openDurationMs: 2000 }) // missing deviceId!
                      }
                    }
                  ]
                }
              }
            ]
          }
        };
      } else {
        finalPayloadSent = data.messages;
        return {
          data: {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: 'Tôi đã sửa lại và đề xuất cho ăn thành công.',
                  tool_calls: [
                    {
                      id: 'call_feed_fixed_device',
                      type: 'function',
                      function: {
                        name: 'proposeFeedNow',
                        arguments: JSON.stringify({ deviceId: 'feeder001', openDurationMs: 2000 })
                      }
                    }
                  ]
                }
              }
            ]
          }
        };
      }
    };

    const res2 = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        messages: [{ role: 'user', content: 'cho ăn 2s đi' }]
      }
    });

    assert.equal(res2.statusCode, 200);
    assert.equal(res2.body.ok, true);
    assert.equal(callCount, 2); // Loop runs twice due to correction
    
    // Verify error tool response was sent back to AI in next loop
    assert.ok(finalPayloadSent);
    // Index 5 in messagesToSend: System + User (Xem ds) + Assistant (list tool call) + User (cho ăn) + Assistant (missing device) + Tool (error response)
    const toolErrorMsg = finalPayloadSent[5];
    assert.equal(toolErrorMsg.role, 'tool');
    assert.equal(toolErrorMsg.tool_call_id, 'call_feed_missing_device');
    const toolErrorContent = JSON.parse(toolErrorMsg.content);
    assert.ok(toolErrorContent.error);
    assert.ok(toolErrorContent.error.includes('Missing or invalid deviceId'));

    // Verify final response to client contains valid deviceId
    assert.ok(res2.body.message.tool_calls);
    const parsedArgs = JSON.parse(res2.body.message.tool_calls[0].function.arguments);
    assert.equal(parsedArgs.deviceId, 'feeder001');
  });

  it('POST /v1/chatbot rejects concurrent calls of getUserDevicesList and proposeFeedNow', async () => {
    mockChatMessages = []; // Reset history
    const token = createAccessToken(mockUser);

    let callCount = 0;
    let finalPayloadSent = null;

    axios.post = async (url, data, config) => {
      callCount++;
      if (callCount === 1) {
        return {
          data: {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: 'Tôi sẽ lấy danh sách thiết bị và cho ăn.',
                  tool_calls: [
                    {
                      id: 'call_list_concurrent',
                      type: 'function',
                      function: {
                        name: 'getUserDevicesList',
                        arguments: '{}'
                      }
                    },
                    {
                      id: 'call_feed_concurrent',
                      type: 'function',
                      function: {
                        name: 'proposeFeedNow',
                        arguments: JSON.stringify({ deviceId: 'feeder001', openDurationMs: 2000 })
                      }
                    }
                  ]
                }
              }
            ]
          }
        };
      } else {
        finalPayloadSent = data.messages;
        return {
          data: {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: 'Tôi đã hiểu và chỉ thực hiện lấy danh sách thiết bị trước.'
                }
              }
            ]
          }
        };
      }
    };

    const res = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        messages: [{ role: 'user', content: 'cho ăn 2s đi' }]
      }
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(callCount, 2);
    
    // Verify that the concurrent proposeFeedNow call was rejected and sent back as a workflow error
    assert.ok(finalPayloadSent);
    
    // Index 0: System
    // Index 1: User (cho ăn 2s đi)
    // Index 2: Assistant (concurrent calls)
    // Index 3: Tool response for getUserDevicesList
    // Index 4: Tool response for proposeFeedNow (should be workflow error)
    const listToolResult = finalPayloadSent[3];
    assert.equal(listToolResult.role, 'tool');
    assert.equal(listToolResult.tool_call_id, 'call_list_concurrent');
    
    const feedToolResult = finalPayloadSent[4];
    assert.equal(feedToolResult.role, 'tool');
    assert.equal(feedToolResult.tool_call_id, 'call_feed_concurrent');
    
    const feedToolContent = JSON.parse(feedToolResult.content);
    assert.ok(feedToolContent.error);
    assert.ok(feedToolContent.error.includes('Violation of Strict Device Action Workflow'));
  });

  it('POST /v1/chatbot allows proposeFeedNow immediately in loop 1 if devices were checked in Turn 1', async () => {
    mockChatMessages = []; // Reset history
    const token = createAccessToken(mockUser);

    // Turn 1: AI calls getUserDevicesList to discover devices
    axios.post = async (url, data, config) => {
      return {
        data: {
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Tôi sẽ lấy danh sách máy.',
                tool_calls: [
                  {
                    id: 'call_list_test_1',
                    type: 'function',
                    function: {
                      name: 'getUserDevicesList',
                      arguments: '{}'
                    }
                  }
                ]
              }
            }
          ]
        }
      };
    };

    const res1 = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        messages: [{ role: 'user', content: 'Xem danh sách thiết bị' }]
      }
    });
    assert.equal(res1.statusCode, 200);

    // Turn 2: AI proposes feeding with valid deviceId in loop 1 (no errors/corrections)
    let callCount = 0;
    axios.post = async (url, data, config) => {
      callCount++;
      return {
        data: {
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Tôi đề xuất cho ăn.',
                tool_calls: [
                  {
                    id: 'call_feed_valid_direct',
                    type: 'function',
                    function: {
                      name: 'proposeFeedNow',
                      arguments: JSON.stringify({ deviceId: 'feeder001', openDurationMs: 2000 })
                    }
                  }
                ]
              }
            }
          ]
        }
      };
    };

    const res2 = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        messages: [{ role: 'user', content: 'cho ăn 2s đi' }]
      }
    });

    assert.equal(res2.statusCode, 200);
    assert.equal(res2.body.ok, true);
    assert.equal(callCount, 1); // Loop runs exactly once (no correction, validated successfully in loop 1)
    
    // Verify tool_calls is returned to client (not stripped)
    assert.ok(res2.body.message.tool_calls);
    assert.equal(res2.body.message.tool_calls.length, 1);
    assert.equal(res2.body.message.tool_calls[0].function.name, 'proposeFeedNow');
    const parsedArgs = JSON.parse(res2.body.message.tool_calls[0].function.arguments);
    assert.equal(parsedArgs.deviceId, 'feeder001');
  });

  it('POST /v1/chatbot rejects proposeFeedNow and triggers workflow error when AI has not checked devices', async () => {
    mockChatMessages = []; // Reset history
    const token = createAccessToken(mockUser);

    axios.post = async (url, data, config) => {
      return {
        data: {
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Tôi đề xuất cho ăn trực tiếp.',
                tool_calls: [
                  {
                    id: 'call_feed_direct_violation',
                    type: 'function',
                    function: {
                      name: 'proposeFeedNow',
                      arguments: JSON.stringify({ deviceId: 'feeder001', openDurationMs: 2000 })
                    }
                  }
                ]
              }
            }
          ]
        }
      };
    };

    const res = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        messages: [{ role: 'user', content: 'cho ăn 2s đi' }]
      }
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    
    // Since AI violated workflow (proposing action without discovering devices first), 
    // the invalid proposeFeedNow tool call must be sanitized and stripped from response.
    assert.equal(res.body.message.tool_calls, undefined);
  });

  it('POST /v1/chatbot matches wiki keyword and passes to system prompt', async () => {
    mockChatMessages = []; // Reset history
    let sentSystemPrompt = null;

    axios.post = async (url, data, config) => {
      const systemMsg = data.messages.find(m => m.role === 'system');
      sentSystemPrompt = systemMsg ? systemMsg.content : null;
      return {
        data: {
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Tôi thấy bạn hỏi về calibrate.'
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
        messages: [{ role: 'user', content: 'Hãy chỉ tôi cách calibrate máy' }]
      }
    });

    assert.equal(res.statusCode, 200);
    assert.ok(sentSystemPrompt);
    assert.ok(sentSystemPrompt.includes('[WIKI] calibrate: Calibrate content here'));
  });

  it('POST /v1/chatbot does NOT match short keyword when it is part of a compound word (False Positive check)', async () => {
    mockChatMessages = [];
    let sentSystemPrompt = null;

    axios.post = async (url, data, config) => {
      const systemMsg = data.messages.find(m => m.role === 'system');
      sentSystemPrompt = systemMsg ? systemMsg.content : null;
      return {
        data: { choices: [{ message: { role: 'assistant', content: 'Mock response' } }] }
      };
    };

    const token = createAccessToken(mockUser);
    const res = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        messages: [{ role: 'user', content: 'Tôi đang đọc một cuốn sách rất độc đáo' }]
      }
    });

    assert.equal(res.statusCode, 200);
    assert.ok(sentSystemPrompt);
    // Should NOT include the toxic wiki entry because 'độc' was part of 'độc đáo'
    assert.ok(!sentSystemPrompt.includes('[WIKI] độc hại,độc'));
  });

  it('POST /v1/chatbot matches short keyword when both compound word and true keyword exist', async () => {
    mockChatMessages = [];
    let sentSystemPrompt = null;

    axios.post = async (url, data, config) => {
      const systemMsg = data.messages.find(m => m.role === 'system');
      sentSystemPrompt = systemMsg ? systemMsg.content : null;
      return {
        data: { choices: [{ message: { role: 'assistant', content: 'Mock response' } }] }
      };
    };

    const token = createAccessToken(mockUser);
    const res = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        messages: [{ role: 'user', content: 'Tôi bị sốt ruột vì chú mèo bị sốt cao' }]
      }
    });

    assert.equal(res.statusCode, 200);
    assert.ok(sentSystemPrompt);
    // Should include the fever wiki entry because 'sốt' in 'sốt cao' is matched, despite 'sốt ruột' being excluded
    assert.ok(sentSystemPrompt.includes('[WIKI] sốt ở chó mèo,sốt,nóng tai,nhiệt độ cao'));
  });

  it('POST /v1/chatbot does NOT match any wiki entries when user query is completely out of context', async () => {
    mockChatMessages = [];
    let sentSystemPrompt = null;

    axios.post = async (url, data, config) => {
      const systemMsg = data.messages.find(m => m.role === 'system');
      sentSystemPrompt = systemMsg ? systemMsg.content : null;
      return {
        data: { choices: [{ message: { role: 'assistant', content: 'Mock response' } }] }
      };
    };

    const token = createAccessToken(mockUser);
    const res = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        messages: [{ role: 'user', content: 'Thời tiết ngày mai thế nào?' }]
      }
    });

    assert.equal(res.statusCode, 200);
    assert.ok(sentSystemPrompt);
    // Should NOT contain any WIKI block since nothing matches
    assert.ok(!sentSystemPrompt.includes('[WIKI]'));
  });

  it('POST /v1/chatbot matches uppercase English abbreviation (e.g. FPV)', async () => {
    mockChatMessages = [];
    let sentSystemPrompt = null;

    axios.post = async (url, data, config) => {
      const systemMsg = data.messages.find(m => m.role === 'system');
      sentSystemPrompt = systemMsg ? systemMsg.content : null;
      return {
        data: { choices: [{ message: { role: 'assistant', content: 'Mock response' } }] }
      };
    };

    const token = createAccessToken(mockUser);
    const res = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        messages: [{ role: 'user', content: 'Mèo nhà em bị nhiễm FPV thì làm thế nào?' }]
      }
    });

    assert.equal(res.statusCode, 200);
    assert.ok(sentSystemPrompt);
    assert.ok(sentSystemPrompt.includes('[WIKI] mèo bị giảm bạch cầu,fpv,viêm ruột truyền nhiễm mèo'));
  });

  it('GET /v1/chatbot/history returns empty list when no chat history exists', async () => {
    mockChatMessages = []; // Reset history
    const token = createAccessToken(mockUser);
    const res = await httpRequest(server, 'GET', '/v1/chatbot/history', {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.history.length, 0);
  });

  it('admin wiki CRUD operations access control and validation', async () => {
    const adminToken = createAccessToken(mockAdminUser);
    const userToken = createAccessToken(mockUser);

    // 1. User cannot access admin wiki endpoints (403)
    const resForbidden = await httpRequest(server, 'GET', '/v1/admin/chatbot/wiki', {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.equal(resForbidden.statusCode, 403);

    // 2. Create wiki entry (Admin)
    const resCreate = await httpRequest(server, 'POST', '/v1/admin/chatbot/wiki', {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        keyword: 'Wifi',
        content: 'Wifi config instructions'
      }
    });
    assert.equal(resCreate.statusCode, 200);
    assert.equal(resCreate.body.ok, true);
    assert.equal(resCreate.body.entry.keyword, 'Wifi');
    const newId = resCreate.body.entry.id;

    // 3. Create wiki duplicate keyword (409)
    const resCreateDup = await httpRequest(server, 'POST', '/v1/admin/chatbot/wiki', {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        keyword: 'Wifi',
        content: 'Duplicate keyword'
      }
    });
    assert.equal(resCreateDup.statusCode, 409);

    // 4. Create wiki entry invalid body (400)
    const resCreateInvalid = await httpRequest(server, 'POST', '/v1/admin/chatbot/wiki', {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        keyword: '',
        content: ''
      }
    });
    assert.equal(resCreateInvalid.statusCode, 400);

    // 5. List wiki entries (Admin)
    const resList = await httpRequest(server, 'GET', '/v1/admin/chatbot/wiki?search=Wifi', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(resList.statusCode, 200);
    assert.ok(resList.body.entries.length >= 1);
    assert.equal(resList.body.entries[0].keyword, 'Wifi');

    // 6. Get single wiki entry (Admin)
    const resGet = await httpRequest(server, 'GET', `/v1/admin/chatbot/wiki/${newId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(resGet.statusCode, 200);
    assert.equal(resGet.body.entry.keyword, 'Wifi');

    // 7. Update wiki entry (Admin)
    const resUpdate = await httpRequest(server, 'PATCH', `/v1/admin/chatbot/wiki/${newId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        content: 'Updated Wifi config instructions'
      }
    });
    assert.equal(resUpdate.statusCode, 200);
    assert.equal(resUpdate.body.entry.content, 'Updated Wifi config instructions');

    // 8. Delete wiki entry (Admin)
    const resDelete = await httpRequest(server, 'DELETE', `/v1/admin/chatbot/wiki/${newId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(resDelete.statusCode, 200);
    assert.equal(resDelete.body.ok, true);

    // 9. Get deleted wiki entry (404)
    const resGetDeleted = await httpRequest(server, 'GET', `/v1/admin/chatbot/wiki/${newId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(resGetDeleted.statusCode, 404);
  });

  it('POST /v1/chatbot supports Multi-Pet memories via updateUserMemory/deleteUserMemory tools and injects context', async () => {
    mockUserMemories = []; // Reset memories
    mockChatMessages = []; // Reset chat messages

    let aiCallCount = 0;
    let sentSystemPrompt = null;

    axios.post = async (url, data, config) => {
      aiCallCount++;
      if (aiCallCount === 1) {
        // First LLM call: User says Bo is a Corgi and eats star kibbles
        return {
          data: {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: 'Tôi sẽ lưu thông tin của bé Bơ nhé!',
                  tool_calls: [
                    {
                      id: 'call_update_mem_1',
                      type: 'function',
                      function: {
                        name: 'updateUserMemory',
                        arguments: JSON.stringify({ entityName: 'Bo', key: 'pet_breed', value: 'Corgi' })
                      }
                    },
                    {
                      id: 'call_update_mem_2',
                      type: 'function',
                      function: {
                        name: 'updateUserMemory',
                        arguments: JSON.stringify({ entityName: 'Bo', key: 'kibble_description', value: 'ngôi sao dẹt, 5mm' })
                      }
                    }
                  ]
                }
              }
            ]
          }
        };
      } else if (aiCallCount === 2) {
        // Second LLM call after tool execution: LLM gives conversational answer
        return {
          data: {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: 'Đã lưu thông tin bé Bơ vào bộ nhớ!'
                }
              }
            ]
          }
        };
      } else {
        // Third LLM call (next chat request): check if memories are injected into System Prompt
        const systemMsg = data.messages.find(m => m.role === 'system');
        sentSystemPrompt = systemMsg ? systemMsg.content : null;
        return {
          data: {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: 'Chào bạn! Mình có thể giúp gì cho bé Bơ?'
                }
              }
            ]
          }
        };
      }
    };

    const token = createAccessToken(mockUser);
    
    // Request 1: Save memories
    const res1 = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        messages: [{ role: 'user', content: 'Bơ nhà mình là giống Corgi, ăn hạt hình ngôi sao dẹt kích thước 5mm nhé.' }]
      }
    });

    assert.equal(res1.statusCode, 200);
    assert.equal(res1.body.ok, true);
    assert.equal(aiCallCount, 2);

    // Verify memories were saved to DB
    assert.equal(mockUserMemories.length, 2);
    assert.equal(mockUserMemories[0].entity_name, 'Bo');
    assert.equal(mockUserMemories[0].memory_key, 'pet_breed');
    assert.equal(mockUserMemories[0].memory_value, 'Corgi');
    assert.equal(mockUserMemories[1].entity_name, 'Bo');
    assert.equal(mockUserMemories[1].memory_key, 'kibble_description');
    assert.equal(mockUserMemories[1].memory_value, 'ngôi sao dẹt, 5mm');

    // Request 2: Send another message to verify system prompt has the memory injected
    const res2 = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        messages: [
          { role: 'user', content: 'Bơ nhà mình là giống Corgi, ăn hạt hình ngôi sao dẹt kích thước 5mm nhé.' },
          { role: 'assistant', content: 'Đã lưu thông tin bé Bơ vào bộ nhớ!' },
          { role: 'user', content: 'Hôm nay bé Bơ ăn thế nào?' }
        ]
      }
    });

    assert.equal(res2.statusCode, 200);
    assert.equal(aiCallCount, 3);
    assert.ok(sentSystemPrompt);
    assert.ok(sentSystemPrompt.includes('[USER MEMORY - SAVED INFORMATION ABOUT USER & PETS]:'));
    assert.ok(sentSystemPrompt.includes('* Pet Bo:'));
    assert.ok(sentSystemPrompt.includes('pet_breed: Corgi'));
    assert.ok(sentSystemPrompt.includes('kibble_description: ngôi sao dẹt, 5mm'));

    // Request 3: Delete a memory key
    aiCallCount = 0;
    axios.post = async (url, data, config) => {
      aiCallCount++;
      if (aiCallCount === 1) {
        return {
          data: {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: 'Tôi sẽ xóa thông tin giống loài của Bơ nhé.',
                  tool_calls: [
                    {
                      id: 'call_delete_mem_1',
                      type: 'function',
                      function: {
                        name: 'deleteUserMemory',
                        arguments: JSON.stringify({ entityName: 'Bo', key: 'pet_breed' })
                      }
                    }
                  ]
                }
              }
            ]
          }
        };
      } else {
        return {
          data: {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: 'Đã xóa thông tin!'
                }
              }
            ]
          }
        };
      }
    };

    const res3 = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        messages: [{ role: 'user', content: 'Quên giống loài của Bơ đi nhé.' }]
      }
    });

    assert.equal(res3.statusCode, 200);
    // Verify breed memory is deleted, but kibble description remains
    assert.equal(mockUserMemories.length, 1);
    assert.equal(mockUserMemories[0].memory_key, 'kibble_description');
  });

  it('POST /v1/chatbot chatbot memory normalization, invalid key validation and empty deletion edge cases', async () => {
    mockUserMemories = []; // Reset memories
    mockChatMessages = []; // Reset chat messages

    const token = createAccessToken(mockUser);

    // Edge Case 1: Normalization and Case-Insensitivity Check ('milo' vs 'Milo')
    let aiCallCount = 0;
    axios.post = async (url, data, config) => {
      aiCallCount++;
      if (aiCallCount === 1) {
        // First tool call: Save using 'milo' in lower case
        return {
          data: {
            choices: [{
              message: {
                role: 'assistant',
                content: 'Lưu milo',
                tool_calls: [{
                  id: 'call_norm_1',
                  type: 'function',
                  function: {
                    name: 'updateUserMemory',
                    arguments: JSON.stringify({ entityName: 'milo', key: 'pet_breed', value: 'Ba Tư' })
                  }
                }]
              }
            }]
          }
        };
      } else if (aiCallCount === 2) {
        return { data: { choices: [{ message: { role: 'assistant', content: 'Đã lưu milo' } }] } };
      } else if (aiCallCount === 3) {
        // Third tool call: Save using 'Milo' in Capital case (should update the existing one)
        return {
          data: {
            choices: [{
              message: {
                role: 'assistant',
                content: 'Cập nhật Milo',
                tool_calls: [{
                  id: 'call_norm_2',
                  type: 'function',
                  function: {
                    name: 'updateUserMemory',
                    arguments: JSON.stringify({ entityName: 'Milo', key: 'pet_breed', value: 'Anh lông ngắn' })
                  }
                }]
              }
            }]
          }
        };
      } else {
        return { data: { choices: [{ message: { role: 'assistant', content: 'Đã cập nhật Milo' } }] } };
      }
    };

    // Save with lowercase 'milo'
    const res1 = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { Authorization: `Bearer ${token}` },
      body: { messages: [{ role: 'user', content: 'Milo là mèo Ba Tư' }] }
    });
    assert.equal(res1.statusCode, 200);
    assert.equal(mockUserMemories.length, 1);
    // Entity name must be normalized to 'Milo' (Capital Case)
    assert.equal(mockUserMemories[0].entity_name, 'Milo');
    assert.equal(mockUserMemories[0].memory_value, 'Ba Tư');

    // Update with Capital Case 'Milo'
    const res2 = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { Authorization: `Bearer ${token}` },
      body: { messages: [{ role: 'user', content: 'Milo là mèo Anh lông ngắn' }] }
    });
    assert.equal(res2.statusCode, 200);
    // Should still have only 1 memory entry (overwritten/updated)
    assert.equal(mockUserMemories.length, 1);
    assert.equal(mockUserMemories[0].memory_value, 'Anh lông ngắn');

    // Edge Case 2: Prevent saving invalid keys (e.g. 'pet_color')
    aiCallCount = 0;
    axios.post = async (url, data, config) => {
      aiCallCount++;
      if (aiCallCount === 1) {
        return {
          data: {
            choices: [{
              message: {
                role: 'assistant',
                content: 'Lưu màu',
                tool_calls: [{
                  id: 'call_invalid_key_1',
                  type: 'function',
                  function: {
                    name: 'updateUserMemory',
                    arguments: JSON.stringify({ entityName: 'Milo', key: 'pet_color', value: 'Vàng' })
                  }
                }]
              }
            }]
          }
        };
      } else {
        // The second call is executed after the server passes the tool error result back to AI
        const toolMsg = data.messages.find(m => m.role === 'tool');
        assert.ok(toolMsg);
        const toolResult = JSON.parse(toolMsg.content);
        assert.ok(toolResult.error);
        assert.ok(toolResult.error.includes('Invalid memory key'));
        return {
          data: { choices: [{ message: { role: 'assistant', content: 'Xin lỗi, tôi không thể lưu khóa đó.' } }] }
        };
      }
    };

    const res3 = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { Authorization: `Bearer ${token}` },
      body: { messages: [{ role: 'user', content: 'Milo màu vàng nhé' }] }
    });
    assert.equal(res3.statusCode, 200);
    // Total memories should still be 1 (invalid key not saved)
    assert.equal(mockUserMemories.length, 1);

    // Edge Case 3: Deleting a key that does not exist
    aiCallCount = 0;
    axios.post = async (url, data, config) => {
      aiCallCount++;
      if (aiCallCount === 1) {
        return {
          data: {
            choices: [{
              message: {
                role: 'assistant',
                content: 'Xóa tuổi',
                tool_calls: [{
                  id: 'call_del_non_exist',
                  type: 'function',
                  function: {
                    name: 'deleteUserMemory',
                    arguments: JSON.stringify({ entityName: 'Milo', key: 'pet_weight_kg' })
                  }
                }]
              }
            }]
          }
        };
      } else {
        const toolMsg = data.messages.find(m => m.role === 'tool');
        assert.ok(toolMsg);
        const toolResult = JSON.parse(toolMsg.content);
        assert.equal(toolResult.success, true);
        assert.equal(toolResult.affectedRows, 0); // 0 rows affected
        return {
          data: { choices: [{ message: { role: 'assistant', content: 'Tôi đã kiểm tra và không thấy thông tin đó.' } }] }
        };
      }
    };

    const res4 = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { Authorization: `Bearer ${token}` },
      body: { messages: [{ role: 'user', content: 'Xóa cân nặng của Milo đi' }] }
    });
    assert.equal(res4.statusCode, 200);
    assert.equal(mockUserMemories.length, 1);
  });

  it('GET /v1/chatbot/history extracts tool_calls from JSON block in message content', async () => {
    // Populate mock history with a JSON block
    const mockJsonBlock = JSON.stringify({
      tool_calls: [
        {
          id: 'call_test_123',
          type: 'function',
          function: {
            name: 'proposeFeedNow',
            arguments: { deviceId: 'feeder001', openDurationMs: 2000 }
          }
        }
      ]
    }, null, 2);

    mockChatMessages = [
      {
        id: 1,
        user_id: mockUser.id,
        role: 'assistant',
        content: `Tôi đề xuất cho ăn.\n\n\`\`\`json\n${mockJsonBlock}\n\`\`\``,
        model: 'gemma-4-e4b',
        created_at: new Date()
      }
    ];

    const token = createAccessToken(mockUser);
    const res = await httpRequest(server, 'GET', '/v1/chatbot/history', {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.history.length, 1);
    
    const msg = res.body.history[0];
    assert.equal(msg.content, 'Tôi đề xuất cho ăn.');
    assert.ok(msg.tool_calls);
    assert.equal(msg.tool_calls.length, 1);
    assert.equal(msg.tool_calls[0].id, 'call_test_123');
    assert.equal(msg.tool_calls[0].function.name, 'proposeFeedNow');
    assert.equal(msg.tool_calls[0].function.arguments.deviceId, 'feeder001');
  });

  it('POST /v1/chatbot checks and handles clientMsgId idempotency / retry logic', async () => {
    mockChatMessages = []; // Reset history
    const token = createAccessToken(mockUser);
    const uuidKey = '110e8400-e29b-41d4-a716-446655440000';

    let llmCallCount = 0;
    axios.post = async (url, data, config) => {
      llmCallCount++;
      return {
        data: {
          choices: [
            {
              message: {
                role: 'assistant',
                content: `Response number ${llmCallCount}`
              }
            }
          ]
        }
      };
    };

    // First request: includes clientMsgId
    const res1 = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        messages: [{ role: 'user', content: 'First try' }],
        clientMsgId: uuidKey
      }
    });

    assert.equal(res1.statusCode, 200);
    assert.equal(res1.body.ok, true);
    assert.equal(res1.body.message.content, 'Response number 1');
    // Expected database state: 1 user message (with clientMsgId) + 1 assistant message
    assert.equal(mockChatMessages.length, 2);
    assert.equal(mockChatMessages[0].role, 'user');
    assert.equal(mockChatMessages[0].content, 'First try');
    assert.equal(mockChatMessages[0].client_msg_id, uuidKey);
    assert.equal(mockChatMessages[1].role, 'assistant');

    // Second request (retry): same clientMsgId
    const res2 = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        // Content might change, but clientMsgId is the same
        messages: [{ role: 'user', content: 'First try' }],
        clientMsgId: uuidKey
      }
    });

    assert.equal(res2.statusCode, 200);
    assert.equal(res2.body.ok, true);
    assert.equal(res2.body.message.content, 'Response number 2');
    // Expected database state: should NOT insert a new user message, but inserts the assistant response
    assert.equal(mockChatMessages.length, 3);
    assert.equal(mockChatMessages[2].role, 'assistant');
    assert.equal(mockChatMessages[2].content, 'Response number 2');
  });

  it('POST /v1/chatbot checks and handles Idempotency-Key header retry logic', async () => {
    mockChatMessages = []; // Reset history
    const token = createAccessToken(mockUser);
    const headerKey = '220e8400-e29b-41d4-a716-446655440000';

    let llmCallCount = 0;
    axios.post = async (url, data, config) => {
      llmCallCount++;
      return {
        data: {
          choices: [
            {
              message: {
                role: 'assistant',
                content: `Response number ${llmCallCount}`
              }
            }
          ]
        }
      };
    };

    // First request: includes Idempotency-Key header
    const res1 = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Idempotency-Key': headerKey
      },
      body: {
        messages: [{ role: 'user', content: 'Header try' }]
      }
    });

    assert.equal(res1.statusCode, 200);
    assert.equal(res1.body.ok, true);
    assert.equal(res1.body.message.content, 'Response number 1');
    // Expected database state: 1 user message (with clientMsgId) + 1 assistant message
    assert.equal(mockChatMessages.length, 2);
    assert.equal(mockChatMessages[0].role, 'user');
    assert.equal(mockChatMessages[0].content, 'Header try');
    assert.equal(mockChatMessages[0].client_msg_id, headerKey);
    assert.equal(mockChatMessages[1].role, 'assistant');

    // Second request (retry): same Idempotency-Key header
    const res2 = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Idempotency-Key': headerKey
      },
      body: {
        messages: [{ role: 'user', content: 'Header try' }]
      }
    });

    assert.equal(res2.statusCode, 200);
    assert.equal(res2.body.ok, true);
    assert.equal(res2.body.message.content, 'Response number 2');
    // Expected database state: should NOT insert a new user message, but inserts the assistant response
    assert.equal(mockChatMessages.length, 3);
    assert.equal(mockChatMessages[2].role, 'assistant');
    assert.equal(mockChatMessages[2].content, 'Response number 2');
  });

  it('POST /v1/chatbot rejects clientMsgId or Idempotency-Key if they exceed 255 characters', async () => {
    const token = createAccessToken(mockUser);
    const longKey = 'a'.repeat(256);

    // Try with long clientMsgId in body
    const res1 = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        messages: [{ role: 'user', content: 'Long body key' }],
        clientMsgId: longKey
      }
    });
    // Should fail at validator (Zod schema strict uuid checks or string validation)
    assert.equal(res1.statusCode, 400);

    // Try with long Idempotency-Key in header
    const res2 = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Idempotency-Key': longKey
      },
      body: {
        messages: [{ role: 'user', content: 'Long header key' }]
      }
    });
    assert.equal(res2.statusCode, 400);
    assert.equal(res2.body.ok, false);
    assert.equal(res2.body.error.code, 'INVALID_CLIENT_MSG_ID');
  });

  it('POST /v1/chatbot handles ER_DUP_ENTRY concurrency error gracefully', async () => {
    mockChatMessages = []; // Reset history
    const token = createAccessToken(mockUser);
    const uuidKey = '330e8400-e29b-41d4-a716-446655440000';

    axios.post = async (url, data, config) => {
      return {
        data: {
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Response with concurrent handle'
              }
            }
          ]
        }
      };
    };

    // Override pool.execute to throw ER_DUP_ENTRY on INSERT
    const pool = getPool();
    const originalExecute = pool.execute;
    
    let isSecondCall = false;
    pool.execute = async (sql, params) => {
      const normalizedSql = sql.replace(/\s+/g, ' ');
      if (normalizedSql.includes('INSERT INTO chatbot_messages') && isSecondCall && params[2] === 'user') {
        // Pretend it was saved concurrently by another request
        mockChatMessages.push({
          id: mockChatMessages.length + 1,
          user_id: params[0],
          session_id: params[1],
          role: 'user',
          content: params[3],
          model: params[4],
          created_at: new Date(),
          client_msg_id: params[6]
        });
        const err = new Error('Duplicate entry');
        err.code = 'ER_DUP_ENTRY';
        throw err;
      }
      return originalExecute(sql, params);
    };

    // First request: normal
    isSecondCall = false;
    const res1 = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        messages: [{ role: 'user', content: 'Hello' }],
        clientMsgId: uuidKey
      }
    });
    assert.equal(res1.statusCode, 200);
    assert.equal(mockChatMessages.length, 2); // user + assistant

    // Second request: throws ER_DUP_ENTRY on user message insert, but should succeed and reuse session
    isSecondCall = true;
    const res2 = await httpRequest(server, 'POST', '/v1/chatbot', {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        messages: [{ role: 'user', content: 'Hello' }],
        clientMsgId: uuidKey
      }
    });
    assert.equal(res2.statusCode, 200);
    assert.equal(res2.body.ok, true);
    assert.equal(res2.body.message.content, 'Response with concurrent handle');
    
    // Restore
    pool.execute = originalExecute;
  });

  it('teardown server and restore mocks', async () => {
    // Restore original methods
    const pool = getPool();
    pool.execute = originalPoolExecute;
    pool.getConnection = originalPoolGetConnection;
    axios.post = originalAxiosPost;

    await new Promise((resolve) => server.close(resolve));
  });
});
