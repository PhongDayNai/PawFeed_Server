import { getChatCompletion } from '../services/ai.service.js';
import { sendSuccess } from '../utils/response.js';

/**
 * Handles chatbot completion requests
 */
export async function askChatbot(req, res) {
  const { messages, model, temperature, maxTokens } = req.body;

  const result = await getChatCompletion({
    messages,
    model,
    temperature,
    maxTokens
  });

  return sendSuccess(res, {
    message: result
  });
}
