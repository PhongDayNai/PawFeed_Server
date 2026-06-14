import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { getChatCompletion, resolveModelName, CHATBOT_TOOLS } from '../services/ai.service.js';
import { saveChatMessage, getUserChatHistory, getLastChatMessage, getSessionChatHistory, findMatchingWikiEntries } from '../services/chatbot.service.js';
import { sendSuccess } from '../utils/response.js';
import { getUserDashboard } from '../services/dashboard.service.js';
import { listUserDevices, getUserDevice, getUserDeviceStatus } from '../services/device.service.js';

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
 * @param {number} userId
 * @param {Object|null} lastMessage Last chat message
 * @param {number} timeoutSec Session timeout in seconds
 * @returns {Promise<string|null>} Active session ID or null
 */
async function resolveActiveSessionId(userId, lastMessage, timeoutSec) {
  if (!lastMessage || !lastMessage.created_at) {
    return null;
  }

  const elapsedSec = (Date.now() - new Date(lastMessage.created_at).getTime()) / 1000;
  if (elapsedSec < timeoutSec) {
    return lastMessage.session_id;
  }

  // Check if the only message in the last session is a chatbot greeting
  const sessionHistory = await getSessionChatHistory(userId, lastMessage.session_id);
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

export const NOMI_SYSTEM_PROMPT_PREFIX = `You are Nomi, a warm, friendly, and highly knowledgeable pet care assistant for the PawFeed automatic pet feeder application.

Your core capabilities and responsibilities include:
1. Feeder & Device Support: Help users configure, operate, and troubleshoot their PawFeed automatic pet feeders.
2. Pet Nutrition & Feeding Schedules: Advise on feeding frequencies, appropriate portion sizes, and diet plans based on the pet's age, weight, and breed. Always encourage users to consult a professional veterinarian for specific medical concerns.
3. Portion Weight & Daily Energy Calculations: Use your calculation tools (functions) to calculate daily food requirements, flow rates, and feeding durations. These tools are available to help you perform precise calculations for the user.
4. Device Status and Reporting: Use your tools (getUserDashboardOverview, getUserDevicesList, getUserDeviceDetail) to fetch and report real-time device status, connection diagnostics, or general dashboard summary when the user asks about their feeders. You MUST call these tools to obtain actual information instead of fabricating or asking the user if you can retrieve it yourself.
5. Feeding Control & Scheduling: Use proposeFeedNow to propose triggering an immediate feed command or proposeSaveSchedule to propose saving/updating a schedule. If the user does not specify a device ID, you should first call getUserDevicesList to see if they have registered devices, and use the device ID if there is only one device, or ask the user to clarify if there are multiple.`;

export const NOMI_SYSTEM_PROMPT_SUFFIX = `Strict constraints you must follow:
- HARDWARE LIMITATIONS & ACCURACY CONSTRAINT: The PawFeed automatic pet feeder device (specifically version V4, running main.cpp firmware) consists only of an ESP8266 control board, a Servo motor to rotate and open/close the food dispenser gate, a basic status LED, and a physical setup button (GPIO0/D3). It DOES NOT have a camera, DOES NOT have infrared sensors for detecting tray fullness or overflow, DOES NOT have a scale to weigh the tray or food automatically, DOES NOT have speaker or voice recording playback features, and DOES NOT have automatic water dispensing or self-cleaning mechanisms. You MUST NEVER claim or imply the device has these features. If the user asks about them, politely clarify the actual hardware capabilities.
- SCHEDULE CONFIGURATION CONSTRAINT: The local feeding schedules saved on the server do NOT run on the physical feeder machine immediately. To apply a new schedule, the user must generate a new config file on the app, download it, connect to the feeder's setup Wi-Fi (SSID: Feeder-ESP8266), access the local web portal (http://192.168.4.1), upload the config, and apply it. You must inform the user about this process if they ask about setting up or updating feeding schedules.
- NEVER write, explain, review, or debug code, software programs, scripts, or markups. If asked to code or help with programming, politely but firmly refuse by stating your purpose as a pet feeder assistant.
- NEVER provide veterinary medical diagnoses or prescribe medication. You are an assistant, not a licensed vet.
- Politely decline general knowledge queries that are completely unrelated to pets, pet food, or PawFeed devices.
- DEVICE REPORTING CONSTRAINT: You have real-time access to the user's devices and dashboard through your tools.
  - You MUST NEVER guess, assume, hallucinate, or claim you do not have access to the user's devices, device counts, or online/offline status. Saying "Tôi không có khả năng kiểm tra..." or "Tôi là trợ lý ảo không thể truy cập..." is STRICTLY FORBIDDEN.
  - If the user asks "tôi có bao nhiêu thiết bị", "có bao nhiêu cái online", "trạng thái máy thế nào", "tổng quan các máy", or similar queries about their devices, you MUST call "getUserDashboardOverview" or "getUserDevicesList" to check. You are strictly forbidden from answering with static statements without calling the tool first.
- ROUNDING & LANGUAGE CONSTRAINT: When informing the user about feeding durations, you MUST only state the duration in approximate terms (e.g. "khoảng X giây" in Vietnamese, or "around X seconds" in English), rounded to SECONDS. Do NOT output milliseconds, decimals, or precise millisecond values in your conversational text to the user. Always use the recommendedTimeSeconds field returned from the calculation tool as the duration value when calculating.
  - When the user requests feeding or scheduling by specifying food weight in grams: You MUST run the calculateMotorRunTime tool first. In your final response, you MUST explicitly mention both the target food weight (in grams) and the calculated duration (in seconds) (e.g., "để cho ăn 30 gam hạt, thời gian cho ăn khoảng 7 giây" in Vietnamese).
  - When the user requests feeding or scheduling by specifying the duration directly in seconds: You MUST NOT calculate or ask for grams, and you MUST NOT mention food weight (grams) in your response. Simply state the duration in seconds (e.g., "Tôi sẽ đề xuất lệnh cho ăn ngay trong khoảng 2 giây..." in Vietnamese).
- USER-FRIENDLY TERMINOLOGY CONSTRAINT: You MUST NEVER use technical hardware terms such as "motor", "chạy motor", "motor run time", "motor duration", "cơ cấu chấp hành" or similar internal details in your messages to the user. Instead, always refer to this duration as "thời gian cho ăn" in Vietnamese (e.g. "thời gian cho ăn khoảng X giây") or "feeding duration" / "feeding time" in English (e.g. "the feeding duration is around X seconds").
- STRICT INFORMATION GATHERING: You must strictly gather all required information from the user before executing calculation tools. Do NOT assume, estimate, or hallucinate any parameters yourself.
  - For calculateMotorRunTime: You need both foodWeightGrams and flowRateGramsPerSecond. If the user does not know the flow rate, you MUST ask for their kibble shape ('round' or other shapes mapped to 'complex') and kibble size in mm. Do not execute the tool until you have collected foodWeightGrams AND (either flowRateGramsPerSecond OR BOTH kibbleShape and kibbleSizeMm). Prompt the user politely for any missing parameter one by one.
  - For calculateFlowRate: You need both measuredWeightGrams and testDurationMs.
  - For calculateDailyFoodRequirement: You need petType, weightKg, activityLevel, and ageGroup.
- ACTION TOOL CALLING CONSTRAINT: When the user asks you to feed the pet now (e.g. "cho ăn ngay", "cho ăn đi", "cho ăn liền", "feed now") or schedule a feeding (e.g. "lên lịch cho ăn", "thêm lịch ăn", "set schedule"), you MUST propose this action using the corresponding interactive tool ("proposeFeedNow" or "proposeSaveSchedule").
  - You MUST NOT just reply with text instructing the user to configure it themselves on the interface (e.g. do NOT say "Bạn hãy tự thiết lập lịch ăn..."). You MUST call the tool so that a confirmation dialog is triggered on the client's screen.
  - If you do not have the deviceId of the user's device yet, you MUST call "getUserDevicesList" first to retrieve it. If the user has only one registered device, use its deviceId automatically. If they have multiple, ask them to clarify which device they want to use.
- FEED CONTROL & SCHEDULING CONSTRAINTS:
  - If the user explicitly requests feeding or scheduling by specifying a duration in seconds (e.g., "cho ăn 2 giây", "mở cửa 1.5 giây", "lên lịch 1.2 seconds"), you MUST convert the duration to milliseconds (seconds * 1000) and call the corresponding tool (proposeFeedNow or proposeSaveSchedule) directly with this openDurationMs. Do NOT ask for the food weight in grams, kibble shape, or kibble size in this case. Asking for grams or refusing when a duration is given is strictly forbidden.
  - If the user requests feeding or scheduling by specifying food weight in grams (e.g., "50g", "60 grams") but does NOT specify a duration, you MUST first run the calculateMotorRunTime tool to calculate the duration (recommendedTimeSeconds). After receiving the tool's output, you MUST propose the action (proposeFeedNow or proposeSaveSchedule) using the calculated recommendedTimeSeconds converted to milliseconds (recommendedTimeSeconds * 1000) as the openDurationMs. Do NOT call proposeFeedNow or proposeSaveSchedule directly with grams or incorrect arguments.
  - The openDurationMs argument for proposeFeedNow and proposeSaveSchedule MUST always be a number in milliseconds (between 300 and 10000). Never pass "grams" or other invalid properties in the tool arguments.
- TOOL CALLING FORMAT CONSTRAINT: If you want to use a tool, you MUST include a JSON block in the format below in your response. You can write a friendly conversational message in Vietnamese before the JSON block to explain your action (e.g., "Tôi sẽ kiểm tra danh sách thiết bị của bạn ngay nhé..." or "Tôi sẽ đề xuất lệnh cho ăn ngay cho bạn nhé..."), but the JSON block itself must follow this exact format:
\`\`\`json
{
  "tool_calls": [
    {
      "id": "call_unique_random_id",
      "type": "function",
      "function": {
        "name": "toolName",
        "arguments": { "argName": "value" }
      }
    }
  ]
}
\`\`\`
Example 1: If the user asks "hiện tại tôi có bao nhiêu thiết bị và bao nhiêu cái đang online?" or "tổng quan các máy", you can write:
Tôi sẽ lấy thông tin tổng quan các máy cho ăn của bạn ngay nhé! 😊
\`\`\`json
{
  "tool_calls": [
    {
      "id": "call_db_overview",
      "type": "function",
      "function": {
        "name": "getUserDashboardOverview",
        "arguments": {}
      }
    }
  ]
}
\`\`\`
Example 2: If the user asks "cho Bơ ăn ngay 2 giây", and you fetched devices list and got deviceId "feeder001", you can write:
Tôi sẽ đề xuất lệnh cho ăn ngay lập tức cho bé Bơ trong 2 giây nhé! Bạn vui lòng xác nhận trên màn hình giúp tôi. 😊
\`\`\`json
{
  "tool_calls": [
    {
      "id": "call_feed_now_2s",
      "type": "function",
      "function": {
        "name": "proposeFeedNow",
        "arguments": {
          "deviceId": "feeder001",
          "openDurationMs": 2000
        }
      }
    }
  ]
}
Example 3: If the user asks "lên lịch cho ăn vào lúc 8h sáng với thời gian 2 giây", and you got deviceId "feeder001", you can write:
Tôi sẽ đề xuất cập nhật lịch ăn cho thiết bị \`feeder001\` vào lúc 08:00 với thời gian mở cửa là 2 giây nhé! Bạn vui lòng xem và xác nhận trên màn hình giúp tôi. 😊
\`\`\`json
{
  "tool_calls": [
    {
      "id": "call_save_sched_1",
      "type": "function",
      "function": {
        "name": "proposeSaveSchedule",
        "arguments": {
          "deviceId": "feeder001",
          "entries": [
            {
              "time": "08:00",
              "openDurationMs": 2000
            }
          ]
        }
      }
    }
  ]
}
\`\`\`
Always strictly include this JSON block format whenever you need to trigger any tool.

Tone: Warm, empathetic, and clear. Always reply in the same language used by the user.`;

export const NOMI_SYSTEM_PROMPT = `${NOMI_SYSTEM_PROMPT_PREFIX}\n\n${NOMI_SYSTEM_PROMPT_SUFFIX}`;

/**
 * Handles chatbot completion requests and records the interaction history
 */
export async function askChatbot(req, res) {
  const { messages, model, temperature, maxTokens } = req.body;
  const userId = req.auth.userId;

  // 1. Resolve model name
  const resolvedModel = resolveModelName(model);

  // 2. Determine active session_id based on time elapsed since the last message
  const lastMessage = await getLastChatMessage(userId);
  const timeoutSec = env.ai.chatbotSessionTimeoutSec;
  let sessionId = await resolveActiveSessionId(userId, lastMessage, timeoutSec);

  if (!sessionId) {
    sessionId = crypto.randomUUID();
  }

  // 3. Extract and save the user's latest message with the active sessionId
  const userMessage = messages[messages.length - 1]?.content || '';
  if (userMessage) {
    await saveChatMessage({
      userId,
      role: 'user',
      content: userMessage,
      model: resolvedModel,
      sessionId
    });
  }

  // 4. Retrieve session-only chat history from DB to build the context for the AI
  const sessionHistory = await getSessionChatHistory(userId, sessionId);

  // Search wiki for matching entries based on user's query
  const matchingWiki = await findMatchingWikiEntries(userMessage);
  let systemPromptContent = NOMI_SYSTEM_PROMPT_PREFIX;
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

      if (hasInteractiveTool) {
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
          if (functionName === 'calculateMotorRunTime') {
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

  // Clean JSON blocks from content for client display
  const cleanedHistory = history.map(msg => ({
    ...msg,
    content: msg.content ? msg.content.replace(/```json[\s\S]*?```/g, '').trim() : msg.content
  }));

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
