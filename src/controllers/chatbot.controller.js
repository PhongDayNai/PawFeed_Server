import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { getChatCompletion, resolveModelName, CHATBOT_TOOLS } from '../services/ai.service.js';
import {
  saveChatMessage,
  getUserChatHistory,
  getLastChatMessage,
  getSessionChatHistory,
  findMatchingWikiEntries,
  getUserMemories,
  saveUserMemory,
  deleteUserMemory as deleteUserMemoryService,
  getMessageByClientMsgId
} from '../services/chatbot.service.js';
import { sendSuccess } from '../utils/response.js';
import { getUserDashboard } from '../services/dashboard.service.js';
import { listUserDevices, getUserDevice, getUserDeviceStatus } from '../services/device.service.js';
import { listUserDeviceEvents, listUserFeedingHistory } from '../services/operationLog.service.js';
import { badRequestError } from '../utils/errors.js';

export const CHATBOT_GREETINGS = [
  "Chào bạn! Tôi là Nomi, trợ lý chăm sóc thú cưng PawFeed. Rất vui được hỗ trợ bạn hôm nay! Bé cưng của bạn thế nào rồi? 🐾",
  "Xin chào! Nomi đây. 🐶 Hôm nay bạn cần tôi hỗ trợ cấu hình lịch ăn hay tính toán lượng hạt cho bé cưng không?",
  "Chào mừng bạn quay trở lại! 🐱 Tôi là Nomi, trợ lý PawFeed của bạn. Hãy nói cho tôi biết nếu bạn cần giúp đỡ với máy cho ăn nhé!",
  "Hi! Nomi đã sẵn sàng giúp bạn rồi đây. 🐾 Bạn muốn tìm hiểu cách calibrate (kiểm định) máy hay lên lịch ăn cho bé cưng hôm nay?",
  "Chào bạn! Nomi rất vui được gặp lại bạn. Hôm nay bé cưng của bạn có ăn uống ngon miệng không? Cần tôi hỗ trợ gì về máy cho ăn cứ bảo nhé! 😊",
  "Chào bạn nhé! Nomi 🐾 đã sẵn sàng. Bạn muốn kiểm tra trạng thái thiết bị hay tính toán khẩu phần ăn hôm nay?",
  "Xin chào! Lại là Nomi đây. 🐱 Hôm nay bé cưng nhà bạn đã ăn mấy bữa rồi? Có cần mình điều chỉnh lịch ăn gì không?",
  "Chào bạn, Nomi chúc bạn một ngày vui vẻ bên bé cưng! 🐶 Hôm nay bạn có muốn thực hiện lệnh cho ăn ngay không?",
  "Hi there! Trợ lý Nomi đã online rồi. 🐾 Hôm nay bạn cần mình giải đáp thắc mắc gì về dòng máy PawFeed V4 thế này?",
  "Chào bạn! Rất vui được gặp lại bạn. Bé cưng của bạn hôm nay khỏe không? Mình có thể giúp gì cho bữa ăn của bé hôm nay? 🐾",
  "Xin chào! Nomi 🐶 luôn sẵn sàng hỗ trợ bạn cấu hình máy và lên thực đơn dinh dưỡng tốt nhất cho bé cưng.",
  "Chào bạn quay trở lại với PawFeed! 🐾 Nomi có thể giúp bạn kiểm tra xem thiết bị nào đang online hôm nay không?",
  "Chào bạn! Hôm nay Nomi 🐱 có thể hỗ trợ bạn tính toán lượng calo cần thiết hay thời gian chạy motor cho máy cho ăn không?",
  "Hello! Nomi đây. 🐾 Bạn có muốn cùng mình thiết lập một lịch trình cho ăn khoa học hơn cho bé cưng hôm nay không?",
  "Chào bạn! Chúc bé cưng nhà bạn có một ngày tràn đầy năng lượng. 🐶 Bạn cần Nomi hỗ trợ thao tác gì trên máy hôm nay?",
  "Xin chào! Nomi 🐾 đã có mặt để đồng hành cùng bạn chăm sóc bé cưng. Thiết bị của bạn hoạt động ổn định chứ?",
  "Chào bạn! Bạn cần Nomi hướng dẫn cách kết nối Wi-Fi hay nạp cấu hình mới cho máy feeder không? 🐾",
  "Hi! Hôm nay Nomi 🐱 sẽ giúp bạn tối ưu hóa lượng thức ăn cho bé cưng. Bạn muốn bắt đầu tính toán hay đặt lịch ăn?",
  "Chào bạn! Nomi rất vui được hỗ trợ bạn. Bé cưng của bạn là mèo hay chó? Cần tính lượng hạt cứ nhắn Nomi nhé! 🐶🐱",
  "Xin chào! Nomi 🐾 luôn ở đây để giúp bé cưng của bạn không bao giờ bị đói. Hôm nay bạn cần trợ giúp gì nào?"
];


/**
 * Resolves the active session ID for a user.
 * If elapsed time exceeds timeout, but the session has only the chatbot greeting message,
 * we still reuse the session instead of starting a new one.
 * If the session exceeds the maximum number of messages, we force a new session.
 * @param {number} userId
 * @param {Object|null} lastMessage Last chat message
 * @param {number} timeoutSec Session timeout in seconds
 * @param {number} [maxMessages=20] Max messages allowed in a single session
 * @returns {Promise<string|null>} Active session ID or null
 */
async function resolveActiveSessionId(userId, lastMessage, timeoutSec, maxMessages = 20) {
  if (!lastMessage || !lastMessage.created_at) {
    return null;
  }

  // Retrieve full history for session to check limit
  const sessionHistory = await getSessionChatHistory(userId, lastMessage.session_id);
  if (sessionHistory.length >= maxMessages) {
    return null; // Force new session if it exceeds maxMessages limit
  }

  const elapsedSec = (Date.now() - new Date(lastMessage.created_at).getTime()) / 1000;
  if (elapsedSec < timeoutSec) {
    return lastMessage.session_id;
  }

  // Check if the only message in the last session is a chatbot greeting
  if (sessionHistory.length === 1) {
    const oldestMessage = sessionHistory[0];
    const isGreeting = oldestMessage &&
      oldestMessage.role === 'assistant' &&
      CHATBOT_GREETINGS.includes(oldestMessage.content);
    if (isGreeting) {
      return lastMessage.session_id;
    }
  }

  return null;
}

/**
 * Validates the arguments of interactive tool calls.
 * Returns null if valid, or a string describing the validation error if invalid.
 * @param {string} functionName
 * @param {Object} args
 * @returns {string|null} Error message or null if valid
 */
/**
 * Validates the arguments of interactive tool calls.
 * Returns null if valid, or a string describing the validation error if invalid.
 * @param {string} functionName
 * @param {Object} args
 * @param {number} userId
 * @param {Array} messagesToSend The history of messages sent in current request
 * @param {Array} currentToolCalls The current batch of tool calls being processed
 * @returns {Promise<string|null>} Error message or null if valid
 */
async function validateInteractiveToolArgs(functionName, args, userId, messagesToSend = [], currentToolCalls = []) {
  // Check if AI has checked devices in the session history
  const hasCheckedDevices = messagesToSend.some(msg => {
    // Exclude the current assistant message that contains the tool calls being validated
    if (msg.role === 'assistant' && currentToolCalls && msg.tool_calls === currentToolCalls) {
      return false;
    }
    // Exclude tool response messages that were generated in the current batch of tool calls
    if (msg.role === 'tool' && currentToolCalls && currentToolCalls.some(tc => tc.id === msg.tool_call_id)) {
      return false;
    }
    if (msg.role === 'tool' && (msg.name === 'getUserDevicesList' || msg.name === 'getUserDashboardOverview')) {
      return true;
    }
    if (msg.role === 'assistant' && msg.content && (msg.content.includes('getUserDevicesList') || msg.content.includes('getUserDashboardOverview'))) {
      return true;
    }
    return false;
  });

  if (!hasCheckedDevices) {
    return "Violation of Strict Device Action Workflow: You must call getUserDevicesList or getUserDashboardOverview first to check the user's registered devices before proposing any control action. Proposing actions without checking the devices list is strictly forbidden.";
  }

  const deviceId = args.deviceId;
  if (!deviceId || typeof deviceId !== 'string' || deviceId.trim() === '') {
    return "Missing or invalid deviceId. You must call getUserDevicesList first to retrieve the user's registered devices and select the correct deviceId. Do not guess or assume a deviceId.";
  }

  // Validate deviceId in database
  try {
    await getUserDevice(deviceId, userId);
  } catch (err) {
    return `Device with ID '${deviceId}' does not exist or is not registered to your account. You must call getUserDevicesList to get the list of your registered devices and use their correct deviceId. The deviceId is a technical unique identifier (e.g. 'feeder001'), NOT the pet's display name or nickname.`;
  }

  if (functionName === 'proposeFeedNow') {
    const openDurationMs = args.openDurationMs;
    if (openDurationMs === undefined || openDurationMs === null || typeof openDurationMs !== 'number') {
      return "Missing or invalid openDurationMs. It must be a valid number representing milliseconds (between 300 and 10000 ms).";
    }
    if (openDurationMs < 300 || openDurationMs > 10000) {
      return `Invalid openDurationMs: ${openDurationMs}. The duration must be between 300 ms (0.3 seconds) and 10000 ms (10 seconds).`;
    }
  }

  if (functionName === 'proposeSaveSchedule') {
    const entries = args.entries;
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return "Missing or invalid entries. It must be a non-empty array of schedule entries containing time and openDurationMs.";
    }

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry || typeof entry !== 'object') {
        return `Invalid schedule entry at index ${i}.`;
      }
      
      const time = entry.time;
      if (!time || typeof time !== 'string' || !timeRegex.test(time)) {
        return `Invalid or missing time at entry index ${i}. Time must be in 24-hour format HH:mm (e.g., "08:30" or "14:15").`;
      }

      const openDurationMs = entry.openDurationMs;
      if (openDurationMs === undefined || openDurationMs === null || typeof openDurationMs !== 'number') {
        return `Missing or invalid openDurationMs at entry index ${i}. It must be a valid number representing milliseconds (between 300 and 10000 ms).`;
      }
      if (openDurationMs < 300 || openDurationMs > 10000) {
        return `Invalid openDurationMs at entry index ${i}: ${openDurationMs}. The duration must be between 300 ms (0.3 seconds) and 10000 ms (10 seconds).`;
      }
    }
  }

  return null;
}

export const NOMI_SYSTEM_PROMPT_PREFIX = `You are Nomi, a warm, friendly, and highly knowledgeable pet care assistant for the PawFeed automatic pet feeder application.

Your core capabilities and responsibilities include:
1. Feeder & Device Support: Help users configure, operate, and troubleshoot their PawFeed automatic pet feeders.
2. Pet Nutrition & Feeding Schedules: Advise on feeding frequencies, appropriate portion sizes, and diet plans based on the pet's age, weight, and breed. Always encourage users to consult a professional veterinarian for specific medical concerns.
3. Portion Weight & Daily Energy Calculations: Use your calculation tools (functions) to calculate daily food requirements, flow rates, and feeding durations. These tools are available to help you perform precise calculations for the user.
4. Device Status, Logs and Reporting: Use your tools (getUserDashboardOverview, getUserDevicesList, getUserDeviceDetail, getUserDeviceEvents, getUserFeedingHistory) to fetch and report real-time device status, connection diagnostics, general dashboard summary, detailed device/system events, or full feeding histories when the user asks about their feeders or their logs/activities. You MUST call these tools to obtain actual information instead of fabricating or asking the user if you can retrieve it yourself.
5. Feeding Control & Scheduling: Use proposeFeedNow to propose triggering an immediate feed command or proposeSaveSchedule to propose saving/updating a schedule. If the user does not specify a device ID, you should first call getUserDevicesList to see if they have registered devices, and use the device ID if there is only one device, or ask the user to clarify if there are multiple.`;

export const NOMI_SYSTEM_PROMPT_SUFFIX = `Strict constraints you must follow:
1. DURATION LIMITS: The openDurationMs argument in proposeFeedNow or proposeSaveSchedule MUST be between 300 (0.3s) and 10000 (10s). You are strictly forbidden from passing any value > 10000 or < 300. If the user requests more than 10s (e.g. 12s), you MUST cap the tool argument to exactly 10000 and explain this capping in chat.
2. HARDWARE LIMITATIONS: PawFeed V4 (firmware main.cpp) runs on ESP8266 with a servo dispenser gate, basic LED, and a setup button (GPIO0/D3). It lacks a camera, scale, speaker, infrared tray/overflow sensors, water dispenser, or self-cleaning. Clarify these limits if asked; never claim they exist.
3. APPLYING SCHEDULES: Saved server schedules do not run on the physical feeder automatically. To apply, users must: generate/download the config on the app, connect to the feeder's setup Wi-Fi (SSID: Feeder-ESP8266), open http://192.168.4.1, then upload and apply the config.
4. BUSINESS LIMITS: Politely refuse coding/software debugging tasks, veterinary medical diagnoses/prescriptions, or general knowledge topics unrelated to pets/PawFeed.
5. DEVICE DATA INTEGRITY: NEVER guess, assume, or hallucinate device details (counts, status, online state). You MUST call getUserDashboardOverview or getUserDevicesList before responding to any device count/status query. Answering with static claims or saying you cannot check is strictly prohibited.
6. WORKFLOW FOR CONTROL ACTIONS: To propose feeding (e.g. "cho ăn", "cho ăn ngay", "ăn") or scheduling (e.g. "lên lịch", "thêm lịch", "cài lịch", "đặt lịch", "sửa lịch"), you MUST call getUserDevicesList first to discover and verify registered devices. Even if the user specifies a device ID (e.g. "feeder001") in their query, you MUST still call getUserDevicesList first in Loop 0. Proposing actions directly without first running getUserDevicesList is strictly forbidden. NEVER ask the user for the device ID, name, or permission to check in chat before calling this tool. If only one device is returned, automatically use its technical deviceId to call proposeFeedNow or proposeSaveSchedule in the same turn. NEVER ask the user for confirmation in chat before proposing; the tool call itself is the proposal that triggers the confirmation dialog on their screen. If multiple exist, list them and ask the user to choose.
7. FEED CONTROL & CALCULATIONS:
   - Grams to Duration: If the user requests feeding/scheduling by weight (grams), you MUST first run calculateMotorRunTime. In your final response, state both target weight and calculated duration (e.g. "cho ăn X gam, khoảng Y giây"), then propose the action.
   - Direct Duration: If a duration in seconds is specified, propose the action directly. DO NOT compute grams, ask for shape/size, or mention weight. Convert seconds to milliseconds (seconds * 1000) for openDurationMs.
8. FORMATTING & TERMINOLOGY:
   - State durations in approximate seconds (e.g. "khoảng X giây" or "around X seconds"), rounded to the nearest integer. Never output milliseconds or decimals to the user. Use recommendedTimeSeconds from calculations.
   - NEVER use technical terms like "motor", "chạy motor", "motor run time", "cơ cấu chấp hành" in conversations. Always use "thời gian cho ăn" (Vietnamese) or "feeding duration" (English).
   - Tool Call Argument: openDurationMs for proposeFeedNow/proposeSaveSchedule MUST be an integer in milliseconds.
9. TOOL USE: You MUST execute the appropriate tools natively when processing queries (e.g. getUserDevicesList for device discovery, calculateMotorRunTime for calculations, updateUserMemory for memory storage). Never ask the user for permission or confirmation before calling query/calculation/memory tools. Keep tone warm, empathetic, and clear. Always reply in the same language used by the user.
10. NO PRE-EMPTIVE QUESTIONS: While calling tools in intermediate turns (e.g. calling getUserDevicesList), NEVER ask the user questions or request device/pet details in your text content. Only state what you are doing (e.g. "Tôi sẽ kiểm tra...") or output no text. Asking questions while calling tools is strictly prohibited and prevents the workflow from completing.`;

export const NOMI_SYSTEM_PROMPT = `${NOMI_SYSTEM_PROMPT_PREFIX}\n\n${NOMI_SYSTEM_PROMPT_SUFFIX}`;

/**
 * Handles chatbot completion requests and records the interaction history
 */
export async function askChatbot(req, res) {
  const { messages, model, temperature, maxTokens, clientMsgId } = req.body;
  const userId = req.auth.userId;

  // 1. Resolve model name
  const resolvedModel = resolveModelName(model);

  // Extract client message identifier from body or header
  const effectiveClientMsgId = clientMsgId || req.headers['idempotency-key'] || null;

  if (effectiveClientMsgId && effectiveClientMsgId.length > 255) {
    throw badRequestError('clientMsgId or Idempotency-Key must be at most 255 characters.', 'INVALID_CLIENT_MSG_ID');
  }

  // Check if message with this clientMsgId / Idempotency-Key already exists
  let sessionId = null;
  let isDuplicate = false;

  if (effectiveClientMsgId) {
    const existingMsg = await getMessageByClientMsgId(userId, effectiveClientMsgId);
    if (existingMsg) {
      isDuplicate = true;
      sessionId = existingMsg.session_id;
    }
  }

  // 2. Determine active session_id based on time elapsed since the last message (if not already resolved)
  if (!sessionId) {
    const lastMessage = await getLastChatMessage(userId);
    const timeoutSec = env.ai.chatbotSessionTimeoutSec;
    sessionId = await resolveActiveSessionId(userId, lastMessage, timeoutSec);

    if (!sessionId) {
      sessionId = crypto.randomUUID();
    }
  }

  // 3. Extract and save the user's latest message with the active sessionId
  const userMessage = messages[messages.length - 1]?.content || '';
  if (userMessage && !isDuplicate) {
    try {
      await saveChatMessage({
        userId,
        role: 'user',
        content: userMessage,
        model: resolvedModel,
        sessionId,
        clientMsgId: effectiveClientMsgId
      });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' || err.message?.includes('Duplicate entry')) {
        // Concurrency retry race condition: another request saved it first
        isDuplicate = true;
        if (effectiveClientMsgId) {
          const existingMsg = await getMessageByClientMsgId(userId, effectiveClientMsgId);
          if (existingMsg) {
            sessionId = existingMsg.session_id;
          }
        }
      } else {
        throw err;
      }
    }
  }

  // 4. Retrieve session-only chat history from DB to build the context for the AI
  // Use sliding window limit of 10 messages to avoid excessively long contexts
  const sessionHistory = await getSessionChatHistory(userId, sessionId, 10);

  // Retrieve user memories from DB
  const userMemories = await getUserMemories(userId);
  let memoryText = '';
  if (userMemories.length > 0) {
    const grouped = {};
    userMemories.forEach(m => {
      if (!grouped[m.entityName]) grouped[m.entityName] = [];
      grouped[m.entityName].push(`  - ${m.key}: ${m.value}`);
    });

    memoryText = Object.keys(grouped).map(entity => {
      const header = entity === 'general' ? '* General preferences:' : `* Pet ${entity}:`;
      return `${header}\n${grouped[entity].join('\n')}`;
    }).join('\n\n');
  }

  // Search wiki for matching entries based on user's query
  const matchingWiki = await findMatchingWikiEntries(userMessage);
  let systemPromptContent = NOMI_SYSTEM_PROMPT_PREFIX;

  // Inject User Memory if exists
  if (memoryText) {
    systemPromptContent += `\n\n[USER MEMORY - SAVED INFORMATION ABOUT USER & PETS]:\n${memoryText}\n(Use the above information directly to answer user queries or as arguments for calculation tools without asking the user again. Pay close attention to distinguish information of each pet by their name.)`;
  }

  if (matchingWiki && matchingWiki.length > 0) {
    const wikiContext = matchingWiki.map(item => `[WIKI] ${item.keyword}: ${item.content}`).join('\n\n');
    systemPromptContent += `\n\nUse the following verified wiki/dictionary entries to answer the user's question accurately. Prioritize this information and do not make up facts:\n${wikiContext}`;
  }
  systemPromptContent += `\n\n${NOMI_SYSTEM_PROMPT_SUFFIX}`;

  // Inject Nomi's system prompt at the beginning of the messages list
  const systemPromptMessage = {
    role: 'system',
    content: systemPromptContent
  };
  const filteredHistory = sessionHistory.filter(m => m.role !== 'system');
  const messagesToSend = [systemPromptMessage, ...filteredHistory];

  // 5. Call AI API and handle tools calling
  let loopCount = 0;
  const maxLoops = 5;
  let currentResponse = null;

  while (loopCount < maxLoops) {
    const aiResponse = await getChatCompletion({
      messages: messagesToSend,
      model,
      temperature,
      maxTokens,
      tools: CHATBOT_TOOLS
    });

    currentResponse = aiResponse;

    if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
      // Check for interactive tools first (proposeFeedNow, proposeSaveSchedule)
      const hasInteractiveTool = aiResponse.tool_calls.some(tc =>
        tc.function.name === 'proposeFeedNow' || tc.function.name === 'proposeSaveSchedule'
      );

      let hasInvalidInteractiveTool = false;
      if (hasInteractiveTool) {
        const results = await Promise.all(aiResponse.tool_calls.map(async (tc) => {
          if (tc.function.name === 'proposeFeedNow' || tc.function.name === 'proposeSaveSchedule') {
            try {
              const args = JSON.parse(tc.function.arguments || '{}');
              const error = await validateInteractiveToolArgs(tc.function.name, args, userId, messagesToSend, aiResponse.tool_calls);
              return error !== null;
            } catch (e) {
              return true;
            }
          }
          return false;
        }));
        hasInvalidInteractiveTool = results.some(r => r === true);
      }

      if (hasInteractiveTool && !hasInvalidInteractiveTool) {
        // Break out of the loop so we return the tool_calls to the client immediately for UI approval
        break;
      }

      // AI requested to call tools
      messagesToSend.push(aiResponse);

      for (const toolCall of aiResponse.tool_calls) {
        const functionName = toolCall.function.name;
        let functionArgs = {};
        try {
          functionArgs = JSON.parse(toolCall.function.arguments || '{}');
        } catch (e) {
          console.error(`Failed to parse arguments for tool ${functionName}:`, e);
        }

        let toolResult;
        try {
          if (functionName === 'proposeFeedNow' || functionName === 'proposeSaveSchedule') {
            const error = await validateInteractiveToolArgs(functionName, functionArgs, userId, messagesToSend, aiResponse.tool_calls);
            if (error) {
              toolResult = { error };
            } else {
              toolResult = {
                status: "waiting_for_missing_information_in_other_calls"
              };
            }
          } else if (functionName === 'calculateMotorRunTime') {
            toolResult = runCalculateMotorRunTime(functionArgs);
          } else if (functionName === 'calculateFlowRate') {
            toolResult = runCalculateFlowRate(functionArgs);
          } else if (functionName === 'calculateDailyFoodRequirement') {
            toolResult = runCalculateDailyFoodRequirement(functionArgs);
          } else if (functionName === 'getUserDashboardOverview') {
            toolResult = await getUserDashboard(userId);
          } else if (functionName === 'getUserDevicesList') {
            toolResult = await listUserDevices(userId, { pageSize: 50 });
          } else if (functionName === 'getUserDeviceDetail') {
            const { deviceId } = functionArgs;
            const deviceDetail = await getUserDevice(deviceId, userId);
            const deviceStatus = await getUserDeviceStatus(deviceId, userId);
            toolResult = { device: deviceDetail, status: deviceStatus };
          } else if (functionName === 'getUserDeviceEvents') {
            const { deviceId, ...query } = functionArgs;
            toolResult = await listUserDeviceEvents(deviceId, userId, query);
          } else if (functionName === 'getUserFeedingHistory') {
            const { deviceId, ...query } = functionArgs;
            toolResult = await listUserFeedingHistory(deviceId, userId, query);
          } else if (functionName === 'updateUserMemory') {
            const { entityName, key, value } = functionArgs;
            toolResult = await saveUserMemory(userId, { entityName, key, value });
          } else if (functionName === 'deleteUserMemory') {
            const { entityName, key } = functionArgs;
            toolResult = await deleteUserMemoryService(userId, { entityName, key });
          } else {
            toolResult = { error: `Tool ${functionName} not implemented` };
          }
        } catch (err) {
          toolResult = { error: err.message || 'Execution error' };
        }

        messagesToSend.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: functionName,
          content: JSON.stringify(toolResult)
        });
      }

      loopCount++;
    } else {
      // AI returned normal response, exit loop
      break;
    }
  }

  // 6. Save the assistant's response
  if (currentResponse?.content || (currentResponse?.tool_calls && currentResponse.tool_calls.length > 0)) {
    // Sanitize tool_calls before saving and sending to client (remove invalid interactive tools)
    if (currentResponse.tool_calls && currentResponse.tool_calls.length > 0) {
      const results = await Promise.all(currentResponse.tool_calls.map(async (tc) => {
        if (tc.function.name === 'proposeFeedNow' || tc.function.name === 'proposeSaveSchedule') {
          try {
            const args = JSON.parse(tc.function.arguments || '{}');
            const error = await validateInteractiveToolArgs(tc.function.name, args, userId, messagesToSend, currentResponse.tool_calls);
            return error !== null;
          } catch (e) {
            return true;
          }
        }
        return false;
      }));
      const hasInvalidInteractiveTool = results.some(r => r === true);

      if (hasInvalidInteractiveTool) {
        currentResponse.tool_calls = undefined;
      }
    }

    let contentToSave = currentResponse.content || '';
    if (currentResponse.tool_calls && currentResponse.tool_calls.length > 0) {
      const formattedToolCalls = currentResponse.tool_calls.map(tc => {
        let parsedArgs = tc.function.arguments;
        if (typeof parsedArgs === 'string') {
          try { parsedArgs = JSON.parse(parsedArgs); } catch (e) {}
        }
        return {
          id: tc.id,
          type: tc.type,
          function: {
            name: tc.function.name,
            arguments: parsedArgs
          }
        };
      });
      const jsonBlock = JSON.stringify({ tool_calls: formattedToolCalls }, null, 2);
      contentToSave = `${contentToSave}\n\n\`\`\`json\n${jsonBlock}\n\`\`\``.trim();
    }

    await saveChatMessage({
      userId,
      role: 'assistant',
      content: contentToSave,
      model: resolvedModel,
      sessionId
    });
  }

  return sendSuccess(res, {
    message: currentResponse
  });
}

/**
 * Retrieves the chatbot conversation history for the authenticated user
 */
export async function getChatHistory(req, res) {
  const userId = req.auth.userId;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);

  const history = await getUserChatHistory(userId, limit);

  // Clean JSON blocks from content for client display and extract tool_calls
  const cleanedHistory = history.map(msg => {
    let tool_calls = undefined;
    let content = msg.content;

    if (content) {
      const jsonRegex = /```json\s*([\s\S]*?)\s*```/g;
      const match = jsonRegex.exec(content);
      if (match) {
        try {
          const parsed = JSON.parse(match[1]);
          if (parsed && parsed.tool_calls) {
            tool_calls = parsed.tool_calls;
          }
        } catch (e) {
          // ignore
        }
      }
      content = content.replace(/```json[\s\S]*?```/g, '').trim();
    }

    return {
      ...msg,
      content,
      ...(tool_calls ? { tool_calls } : {})
    };
  });

  return sendSuccess(res, {
    history: cleanedHistory
  });
}

/**
 * Initializes chatbot session for the user when opening chat.
 * Generates and saves a warm greeting if it's a new session, or returns the existing session id.
 */
export async function initChatbotSession(req, res) {
  const userId = req.auth.userId;
  const lastMessage = await getLastChatMessage(userId);
  const timeoutSec = env.ai.chatbotSessionTimeoutSec;

  let sessionId = await resolveActiveSessionId(userId, lastMessage, timeoutSec);
  let isNewSession = false;
  let greetingText = '';

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    isNewSession = true;

    // Pick a random greeting message for Nomi
    greetingText = CHATBOT_GREETINGS[Math.floor(Math.random() * CHATBOT_GREETINGS.length)];

    // Save the greeting as an assistant message in the DB
    await saveChatMessage({
      userId,
      role: 'assistant',
      content: greetingText,
      model: resolveModelName(null),
      sessionId
    });
  }

  return sendSuccess(res, {
    isNewSession,
    sessionId,
    ...(isNewSession ? { greeting: greetingText } : {})
  });
}

/**
 * Calculates motor run time for the feeder
 */
export function runCalculateMotorRunTime({ foodWeightGrams, flowRateGramsPerSecond, kibbleShape, kibbleSizeMm }) {
  let r = flowRateGramsPerSecond;
  let isEstimated = false;

  if (!r && kibbleShape && kibbleSizeMm) {
    const shape = kibbleShape.toLowerCase().trim();
    const size = parseFloat(kibbleSizeMm);

    if (shape === 'round') {
      if (size <= 6) r = 5.5;
      else if (size <= 9) r = 4.8;
      else r = 4.2;
    } else {
      if (size <= 6) r = 4.5;
      else if (size <= 9) r = 3.8;
      else r = 3.2;
    }
    isEstimated = true;
  }

  if (!r) {
    r = 4.5;
    isEstimated = true;
  }

  const motorDurationMs = Math.round((foodWeightGrams / r) * 1000 + 504);
  const clientDurationMs = Math.max(0, motorDurationMs - 1008);
  const recommendedTimeSeconds = Math.round(motorDurationMs / 1000);

  return {
    foodWeightGrams,
    estimatedFlowRate: r,
    isEstimated,
    motorDurationMs,
    clientDurationMs,
    recommendedTimeSeconds
  };
}

/**
 * Calculates flow rate based on calibration test weight
 */
export function runCalculateFlowRate({ measuredWeightGrams, testDurationMs }) {
  const durationMs = testDurationMs ?? 10000;
  const effectiveDurationMs = durationMs - 504;

  if (effectiveDurationMs <= 0) {
    throw new Error('Test duration must be larger than 504ms');
  }

  const flowRate = measuredWeightGrams / (effectiveDurationMs / 1000);
  return {
    measuredWeightGrams,
    testDurationMs: durationMs,
    effectiveDurationMs,
    flowRateGramsPerSecond: parseFloat(flowRate.toFixed(2))
  };
}

/**
 * Calculates daily energy and food weight requirements for pets
 */
export function runCalculateDailyFoodRequirement({ petType, weightKg, activityLevel, ageGroup, calorieDensity }) {
  const density = calorieDensity ?? 3500;
  const type = petType.toLowerCase().trim();
  const activity = activityLevel.toLowerCase().trim();
  const age = ageGroup.toLowerCase().trim();

  const rer = 70 * Math.pow(weightKg, 0.75);

  let derFactor = 1.0;
  if (type === 'cat') {
    if (age === 'kitten_puppy') derFactor = 2.5;
    else if (age === 'senior') derFactor = 1.1;
    else {
      if (activity === 'low') derFactor = 1.0;
      else if (activity === 'high') derFactor = 1.4;
      else derFactor = 1.2;
    }
  } else {
    if (age === 'kitten_puppy') derFactor = 3.0;
    else if (age === 'senior') derFactor = 1.4;
    else {
      if (activity === 'low') derFactor = 1.3;
      else if (activity === 'high') derFactor = 2.0;
      else derFactor = 1.6;
    }
  }

  const der = rer * derFactor;
  const foodGrams = (der / density) * 1000;

  return {
    petType,
    weightKg,
    restingEnergyRequirementKcal: Math.round(rer),
    dailyEnergyRequirementKcal: Math.round(der),
    recommendedDailyFoodGrams: Math.round(foodGrams),
    calorieDensityUsed: density
  };
}
