import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { getChatCompletion, resolveModelName, CHATBOT_TOOLS } from '../services/ai.service.js';
import { saveChatMessage, getUserChatHistory, getLastChatMessage, getSessionChatHistory, findMatchingWikiEntries } from '../services/chatbot.service.js';
import { sendSuccess } from '../utils/response.js';

export const NOMI_SYSTEM_PROMPT = `You are Nomi, a warm, friendly, and highly knowledgeable pet care assistant for the PawFeed automatic pet feeder application.

Your core capabilities and responsibilities include:
1. Feeder & Device Support: Help users configure, operate, and troubleshoot their PawFeed automatic pet feeders.
2. Pet Nutrition & Feeding Schedules: Advise on feeding frequencies, appropriate portion sizes, and diet plans based on the pet's age, weight, and breed. Always encourage users to consult a professional veterinarian for specific medical concerns.
3. Portion Weight & Daily Energy Calculations: Use your calculation tools (functions) to calculate daily food requirements, flow rates, and feeding durations. These tools are available to help you perform precise calculations for the user.

Strict constraints you must follow:
- NEVER write, explain, review, or debug code, software programs, scripts, or markups. If asked to code or help with programming, politely but firmly refuse by stating your purpose as a pet feeder assistant.
- NEVER provide veterinary medical diagnoses or prescribe medication. You are an assistant, not a licensed vet.
- Politely decline general knowledge queries that are completely unrelated to pets, pet food, or PawFeed devices.
- ROUNDING & LANGUAGE CONSTRAINT: When informing the user about feeding durations, you MUST only state the duration in approximate terms (e.g. "khoảng X giây" in Vietnamese, or "around X seconds" in English), rounded to SECONDS. Do NOT output milliseconds, decimals, or precise millisecond values in your conversational text to the user. Always use the recommendedTimeSeconds field returned from the calculation tool as the duration value. You MUST explicitly mention both the target food weight (in grams) and the calculated duration (in seconds) in your final response (e.g., "để cho ăn 60 gam hạt, thời gian cho ăn khoảng 13 giây" in Vietnamese, or "To feed 60 grams of kibble, the feeding duration is around 13 seconds" in English).
- USER-FRIENDLY TERMINOLOGY CONSTRAINT: You MUST NEVER use technical hardware terms such as "motor", "chạy motor", "motor run time", "motor duration", "cơ cấu chấp hành" or similar internal details in your messages to the user. Instead, always refer to this duration as "thời gian cho ăn" in Vietnamese (e.g. "thời gian cho ăn khoảng X giây") or "feeding duration" / "feeding time" in English (e.g. "the feeding duration is around X seconds").
- STRICT INFORMATION GATHERING: You must strictly gather all required information from the user before executing calculation tools. Do NOT assume, estimate, or hallucinate any parameters yourself.
  - For calculateMotorRunTime: You need both foodWeightGrams and flowRateGramsPerSecond. If the user does not know the flow rate, you MUST ask for their kibble shape ('round' or other shapes mapped to 'complex') and kibble size in mm. Do not execute the tool until you have collected foodWeightGrams AND (either flowRateGramsPerSecond OR BOTH kibbleShape and kibbleSizeMm). Prompt the user politely for any missing parameter one by one.
  - For calculateFlowRate: You need both measuredWeightGrams and testDurationMs.
  - For calculateDailyFoodRequirement: You need petType, weightKg, activityLevel, and ageGroup.

Tone: Warm, empathetic, and clear. Always reply in the same language used by the user.`;

/**
 * Handles chatbot completion requests and records the interaction history
 */
export async function askChatbot(req, res) {
  const { messages, model, temperature, maxTokens } = req.body;
  const userId = req.auth.userId;

  // 1. Resolve model name
  const resolvedModel = resolveModelName(model);

  // 2. Determine active session_id based on time elapsed since the last message
  let sessionId;
  const lastMessage = await getLastChatMessage(userId);
  const timeoutSec = env.ai.chatbotSessionTimeoutSec;

  if (lastMessage && lastMessage.created_at) {
    const elapsedSec = (Date.now() - new Date(lastMessage.created_at).getTime()) / 1000;
    if (elapsedSec < timeoutSec) {
      sessionId = lastMessage.session_id;
    }
  }

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
  let systemPromptContent = NOMI_SYSTEM_PROMPT;
  if (matchingWiki && matchingWiki.length > 0) {
    const wikiContext = matchingWiki.map(item => `[WIKI] ${item.keyword}: ${item.content}`).join('\n\n');
    systemPromptContent += `\n\nUse the following verified wiki/dictionary entries to answer the user's question accurately. Prioritize this information and do not make up facts:\n${wikiContext}`;
  }

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
  if (currentResponse?.content) {
    await saveChatMessage({
      userId,
      role: 'assistant',
      content: currentResponse.content,
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

  return sendSuccess(res, {
    history
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

  let sessionId;
  let isNewSession = false;
  let greetingText = '';

  if (lastMessage && lastMessage.created_at) {
    const elapsedSec = (Date.now() - new Date(lastMessage.created_at).getTime()) / 1000;
    if (elapsedSec < timeoutSec) {
      sessionId = lastMessage.session_id;
    }
  }

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    isNewSession = true;

    // Pick a random greeting message for Nomi
    const greetings = [
      "Chào bạn! Tôi là Nomi, trợ lý chăm sóc thú cưng PawFeed. Rất vui được hỗ trợ bạn hôm nay! Bé cưng của bạn thế nào rồi? 🐾",
      "Xin chào! Nomi đây. 🐶 Hôm nay bạn cần tôi hỗ trợ cấu hình lịch ăn hay tính toán lượng hạt cho bé cưng không?",
      "Chào mừng bạn quay trở lại! 🐱 Tôi là Nomi, trợ lý PawFeed của bạn. Hãy nói cho tôi biết nếu bạn cần giúp đỡ với máy cho ăn nhé!",
      "Hi! Nomi đã sẵn sàng giúp bạn rồi đây. 🐾 Bạn muốn tìm hiểu cách calibrate (kiểm định) máy hay lên lịch ăn cho bé cưng hôm nay?",
      "Chào bạn! Nomi rất vui được gặp lại bạn. Hôm nay bé cưng của bạn có ăn uống ngon miệng không? Cần tôi hỗ trợ gì về máy cho ăn cứ bảo nhé! 😊"
    ];
    greetingText = greetings[Math.floor(Math.random() * greetings.length)];

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
