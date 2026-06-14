import axios from 'axios';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

const MODEL_MAPPING = {
  'gemma-4-e4b': 'gemma-4-E4B-it-uncensored-heretic-Q4_K_M.gguf'
};

export function resolveModelName(modelName) {
  if (!modelName) {
    return env.ai.model;
  }
  const normalized = modelName.toLowerCase().trim();
  if (MODEL_MAPPING[normalized]) {
    return MODEL_MAPPING[normalized];
  }
  if (normalized.startsWith('gemma-4-e4b')) {
    return 'gemma-4-E4B-it-uncensored-heretic-Q4_K_M.gguf';
  }
  return modelName;
}

/**
 * Calls the OpenAI compatible AI server to get chat completions.
 * @param {Object} params
 * @param {Array} params.messages Array of message objects { role, content }
 * @param {string} [params.model] Short or full name of the model
 * @param {number} [params.temperature] Temperature value (0 to 2)
 * @param {number} [params.maxTokens] Max tokens to generate
 * @returns {Promise<Object>} The response message object { role, content }
 */
export async function getChatCompletion({ messages, model, temperature, maxTokens }) {
  const url = `${env.ai.baseUrl.replace(/\/$/, '')}/chat/completions`;

  const headers = {
    'Content-Type': 'application/json'
  };

  if (env.ai.apiKey) {
    headers['Authorization'] = `Bearer ${env.ai.apiKey}`;
  }

  const payload = {
    model: resolveModelName(model),
    messages,
    temperature: temperature ?? 0.7,
    ...(maxTokens !== undefined ? { max_tokens: maxTokens } : {})
  };

  try {
    const response = await axios.post(url, payload, { headers, timeout: 120000 });
    
    const choice = response.data?.choices?.[0];
    if (!choice || !choice.message) {
      throw new Error('Invalid response structure from AI server.');
    }

    return choice.message;
  } catch (error) {
    let message = 'Failed to communicate with AI server.';
    let statusCode = 502; // Bad Gateway
    let details = error.message;

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      statusCode = error.response.status === 401 || error.response.status === 403 
        ? 500 // Map authorization issues with AI API to internal server error
        : error.response.status;
      message = error.response.data?.error?.message || `AI server responded with error status ${error.response.status}`;
      details = error.response.data;
    } else if (error.request) {
      // The request was made but no response was received
      statusCode = 504; // Gateway Timeout
      message = 'AI server did not respond in time.';
    }

    throw new AppError(message, statusCode, 'AI_SERVICE_ERROR', details);
  }
}
