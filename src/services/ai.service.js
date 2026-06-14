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

export const CHATBOT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'calculateMotorRunTime',
      description: 'Calculate feeder motor run time (seconds and milliseconds) based on desired food weight. Supports auto-estimating the flow rate if the user provides kibble size and shape.',
      parameters: {
        type: 'object',
        properties: {
          foodWeightGrams: {
            type: 'number',
            description: 'Desired food weight in grams.'
          },
          flowRateGramsPerSecond: {
            type: 'number',
            description: 'Kibble flow rate in grams per second. Provide this if the feeder has been calibrated.'
          },
          kibbleShape: {
            type: 'string',
            enum: ['round', 'complex'],
            description: 'Kibble shape: "round" or "complex" (e.g. triangle, star, bone).'
          },
          kibbleSizeMm: {
            type: 'number',
            description: 'Kibble size in millimeters (mm).'
          }
        },
        required: ['foodWeightGrams']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculateFlowRate',
      description: 'Calculate actual kibble flow rate (g/s) at fully open state based on measured kibble weight after a calibration test run.',
      parameters: {
        type: 'object',
        properties: {
          measuredWeightGrams: {
            type: 'number',
            description: 'Measured kibble weight in grams collected during the test run.'
          },
          testDurationMs: {
            type: 'number',
            description: 'Test run duration in milliseconds. Defaults to 10000 ms (10 seconds).'
          }
        },
        required: ['measuredWeightGrams']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculateDailyFoodRequirement',
      description: 'Calculate daily energy requirement (RER/DER) and recommended daily food weight (grams) for dogs or cats based on pet type, weight, activity level, age group, and food calorie density.',
      parameters: {
        type: 'object',
        properties: {
          petType: {
            type: 'string',
            enum: ['cat', 'dog'],
            description: 'Pet type: "cat" or "dog".'
          },
          weightKg: {
            type: 'number',
            description: 'Weight of the pet in kilograms (kg).'
          },
          activityLevel: {
            type: 'string',
            enum: ['low', 'normal', 'high'],
            description: 'Pet activity level: "low", "normal", or "high".'
          },
          ageGroup: {
            type: 'string',
            enum: ['kitten_puppy', 'adult', 'senior'],
            description: 'Pet age group: "kitten_puppy", "adult", or "senior".'
          },
          calorieDensity: {
            type: 'number',
            description: 'Calorie density of the food in kcal/kg. Defaults to 3500 kcal/kg.'
          }
        },
        required: ['petType', 'weightKg', 'activityLevel', 'ageGroup']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getUserDashboardOverview',
      description: 'Get the dashboard summary and overview of all pet feeder devices for the current user, including device counts, online/offline status, and recent feeding histories.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getUserDevicesList',
      description: 'Get the list of all registered pet feeder devices owned by the current user, including device IDs, display names, connection status (online/offline), and active config details.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getUserDeviceDetail',
      description: 'Get the detailed current status, network diagnostic metrics (RSSI, heap, uptime), and active configuration of a specific pet feeder device.',
      parameters: {
        type: 'object',
        properties: {
          deviceId: {
            type: 'string',
            description: 'The unique ID of the target device.'
          }
        },
        required: ['deviceId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'proposeFeedNow',
      description: 'Propose to immediately trigger a feeding command (feed once) on a specific device. This action requires user confirmation/approval on the UI before execution.',
      parameters: {
        type: 'object',
        properties: {
          deviceId: {
            type: 'string',
            description: 'The unique ID of the target device.'
          },
          openDurationMs: {
            type: 'number',
            description: 'The duration to open the food dispenser door in milliseconds (typically between 300 and 10000 ms).'
          }
        },
        required: ['deviceId', 'openDurationMs']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'proposeSaveSchedule',
      description: 'Propose to save/update the feeding schedule for a specific device. This action requires user review and confirmation on the UI before being saved.',
      parameters: {
        type: 'object',
        properties: {
          deviceId: {
            type: 'string',
            description: 'The unique ID of the target device.'
          },
          entries: {
            type: 'array',
            description: 'The list of schedule entries.',
            items: {
              type: 'object',
              properties: {
                time: {
                  type: 'string',
                  description: 'Time of day in 24-hour format (HH:mm, e.g., "08:30").'
                },
                openDurationMs: {
                  type: 'number',
                  description: 'Dispenser opening duration in milliseconds (between 300 and 10000 ms).'
                }
              },
              required: ['time', 'openDurationMs']
            }
          }
        },
        required: ['deviceId', 'entries']
      }
    }
  }
];

/**
 * Calls the OpenAI compatible AI server to get chat completions.
 * @param {Object} params
 * @param {Array} params.messages Array of message objects { role, content }
 * @param {string} [params.model] Short or full name of the model
 * @param {number} [params.temperature] Temperature value (0 to 2)
 * @param {number} [params.maxTokens] Max tokens to generate
 * @param {Array} [params.tools] Array of tool objects
 * @param {string|Object} [params.toolChoice] Tool choice configuration
 * @returns {Promise<Object>} The response message object { role, content, tool_calls }
 */
export async function getChatCompletion({ messages, model, temperature, maxTokens, tools, toolChoice }) {
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
    ...(maxTokens !== undefined ? { max_tokens: maxTokens } : {}),
    ...(tools !== undefined ? { tools } : {}),
    ...(toolChoice !== undefined ? { tool_choice: toolChoice } : {})
  };

  try {
    const response = await axios.post(url, payload, { headers, timeout: 120000 });
    
    const choice = response.data?.choices?.[0];
    if (!choice || !choice.message) {
      throw new Error('Invalid response structure from AI server.');
    }

    const message = choice.message;

    // Fallback: If tool_calls is not populated but content contains a JSON block with tool_calls
    if ((!message.tool_calls || message.tool_calls.length === 0) && message.content) {
      const jsonRegex = /```json\s*([\s\S]*?)\s*```/g;
      const match = jsonRegex.exec(message.content);
      const jsonText = match ? match[1] : message.content.trim();
      
      try {
        const parsed = JSON.parse(jsonText);
        if (parsed && Array.isArray(parsed.tool_calls)) {
          message.tool_calls = parsed.tool_calls.map(tc => {
            if (tc.function && typeof tc.function.arguments === 'object') {
              return {
                ...tc,
                function: {
                  ...tc.function,
                  arguments: JSON.stringify(tc.function.arguments)
                }
              };
            }
            return tc;
          });
          
          if (parsed.content !== undefined) {
            message.content = parsed.content;
          } else {
            message.content = message.content.replace(/```json[\s\S]*?```/g, '').trim();
            if (message.content === '') {
              message.content = null;
            }
          }
        }
      } catch (e) {
        // Not a valid JSON or tool call structure, ignore
      }
    }

    return message;
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
