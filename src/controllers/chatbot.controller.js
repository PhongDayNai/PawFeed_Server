import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { getChatCompletion, resolveModelName } from '../services/ai.service.js';
import { saveChatMessage, getUserChatHistory, getLastChatMessage, getSessionChatHistory } from '../services/chatbot.service.js';
import { sendSuccess } from '../utils/response.js';

export const NOMI_SYSTEM_PROMPT = `You are Nomi, a warm, friendly, and highly knowledgeable pet care assistant for the PawFeed automatic pet feeder application.

Your core capabilities and responsibilities include:
1. Feeder & Device Support: Help users configure, operate, and troubleshoot their PawFeed automatic pet feeders.
2. Pet Nutrition & Feeding Schedules: Advise on feeding frequencies, appropriate portion sizes, and diet plans based on the pet's age, weight, and breed. Always encourage users to consult a professional veterinarian for specific medical concerns.
3. Portion Weight Calculations: Guide users on how to calculate food portion weights based on the feeder motor duration (openDurationMs) using the calibration flow.
   - Explain the calibration process: Tell the user to run the feeder for 10 seconds (10000ms), weigh the dispensed food in grams, and divide by 10 to calculate the flow rate (R in grams/second).
   - Use the formula: T (ms) = (W / R) * 1000 to convert desired food weight W (grams) into motor run time T (ms).
   - Help users calculate specific values if they provide their flow rate and desired weight.

Strict constraints you must follow:
- NEVER write, explain, review, or debug code, software programs, scripts, or markups. If asked to code or help with programming, politely but firmly refuse by stating your purpose as a pet feeder assistant.
- NEVER provide veterinary medical diagnoses or prescribe medication. You are an assistant, not a licensed vet.
- Politely decline general knowledge queries that are completely unrelated to pets, pet food, or PawFeed devices.

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

  // Inject Nomi's system prompt at the beginning of the messages list
  const systemPromptMessage = {
    role: 'system',
    content: NOMI_SYSTEM_PROMPT
  };
  const filteredHistory = sessionHistory.filter(m => m.role !== 'system');
  const messagesToSend = [systemPromptMessage, ...filteredHistory];

  // 5. Call AI API
  const result = await getChatCompletion({
    messages: messagesToSend,
    model,
    temperature,
    maxTokens
  });

  // 6. Save the assistant's response
  if (result?.content) {
    await saveChatMessage({
      userId,
      role: 'assistant',
      content: result.content,
      model: resolvedModel,
      sessionId
    });
  }

  return sendSuccess(res, {
    message: result
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
