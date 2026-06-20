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
            description: 'The duration to open the food dispenser door in milliseconds (typically between 100 and 600000 ms).'
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
                  description: 'Dispenser opening duration in milliseconds (between 100 and 600000 ms).'
                }
              },
              required: ['time', 'openDurationMs']
            }
          }
        },
        required: ['deviceId', 'entries']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'updateUserMemory',
      description: 'Save or update a specific piece of information about a pet (e.g. kibble size/shape, weight, breed) or general user preferences. Call this tool whenever the user provides new characteristics about their pets to remember them across session chats.',
      parameters: {
        type: 'object',
        properties: {
          entityName: {
            type: 'string',
            description: 'The name of the target pet (e.g. "Bo", "Milo") or "general" if the information is generic to the user and not pet-specific.'
          },
          key: {
            type: 'string',
            enum: ['kibble_description', 'pet_breed', 'pet_weight_kg', 'user_preferences'],
            description: 'The key identifying the kind of information.'
          },
          value: {
            type: 'string',
            description: 'The details to remember. Keep it concise but complete (e.g. "ngôi sao dẹt, dày 2mm, kích thước 5mm").'
          }
        },
        required: ['entityName', 'key', 'value']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'deleteUserMemory',
      description: 'Remove/forget a specific memory key for a pet or general user setting when it is no longer correct or requested to be forgotten.',
      parameters: {
        type: 'object',
        properties: {
          entityName: {
            type: 'string',
            description: 'The name of the pet (e.g. "Bo", "Milo") or "general".'
          },
          key: {
            type: 'string',
            description: 'The memory key to delete.'
          }
        },
        required: ['entityName', 'key']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getUserDeviceEvents',
      description: 'Get a paginated list of system and hardware events/logs for a specific pet feeder device (e.g. telemetry, online status, configuration apply events).',
      parameters: {
        type: 'object',
        properties: {
          deviceId: {
            type: 'string',
            description: 'The unique ID of the target device.'
          },
          eventType: {
            type: 'string',
            description: 'Filter events by type (e.g., "telemetry", "config_apply", "wifi_connected").'
          },
          source: {
            type: 'string',
            description: 'Filter events by source (e.g., "device", "server").'
          },
          requestId: {
            type: 'string',
            description: 'Filter events by associated request ID.'
          },
          configId: {
            type: 'string',
            description: 'Filter events by associated configuration ID.'
          },
          page: {
            type: 'number',
            description: 'Page number for pagination.'
          },
          pageSize: {
            type: 'number',
            description: 'Number of events per page.'
          },
          from: {
            type: 'string',
            description: 'ISO 8601 date string to filter events starting from this date.'
          },
          to: {
            type: 'string',
            description: 'ISO 8601 date string to filter events up to this date.'
          }
        },
        required: ['deviceId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getUserFeedingHistory',
      description: 'Get a paginated list of feeding history records for a specific pet feeder device, showing when feedings started/finished, their status (completed, failed, etc.), and duration.',
      parameters: {
        type: 'object',
        properties: {
          deviceId: {
            type: 'string',
            description: 'The unique ID of the target device.'
          },
          source: {
            type: 'string',
            enum: ['remote', 'schedule', 'manual', 'test'],
            description: 'Filter by source: "remote", "schedule", "manual", or "test".'
          },
          status: {
            type: 'string',
            enum: ['completed', 'failed', 'timeout', 'cancelled'],
            description: 'Filter by status: "completed", "failed", "timeout", or "cancelled".'
          },
          requestId: {
            type: 'string',
            description: 'Filter feeding history by associated request ID.'
          },
          scheduleId: {
            type: 'number',
            description: 'Filter feeding history by associated schedule ID.'
          },
          page: {
            type: 'number',
            description: 'Page number for pagination.'
          },
          pageSize: {
            type: 'number',
            description: 'Number of history entries per page.'
          },
          from: {
            type: 'string',
            description: 'ISO 8601 date string to filter entries starting from this date.'
          },
          to: {
            type: 'string',
            description: 'ISO 8601 date string to filter entries up to this date.'
          }
        },
        required: ['deviceId']
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
 * @param {boolean} [params.stream] Whether to stream the response
 * @param {Function} [params.onStreamChunk] Callback triggered with each stream text chunk
 * @returns {Promise<Object>} The response message object { role, content, tool_calls }
 */
export async function getChatCompletion({ messages, model, temperature, maxTokens, tools, toolChoice, stream, onStreamChunk }) {
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
    ...(toolChoice !== undefined ? { tool_choice: toolChoice } : {}),
    ...(stream !== undefined ? { stream } : {})
  };

  try {
    if (stream) {
      const response = await axios.post(url, payload, { headers, timeout: 120000, responseType: 'stream' });
      
      let accumulatedContent = '';
      const accumulatedToolCalls = [];

      return new Promise((resolve, reject) => {
        let buffer = '';

        response.data.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (trimmed === 'data: [DONE]') {
              continue;
            }
            if (trimmed.startsWith('data: ')) {
              const jsonStr = trimmed.slice(6);
              try {
                const parsed = JSON.parse(jsonStr);
                const choice = parsed.choices?.[0];
                if (choice && choice.delta) {
                  const delta = choice.delta;
                  
                  if (delta.tool_calls) {
                    for (const tc of delta.tool_calls) {
                      const idx = tc.index;
                      if (!accumulatedToolCalls[idx]) {
                        accumulatedToolCalls[idx] = {
                          id: tc.id,
                          type: tc.type,
                          function: { name: tc.function?.name || '', arguments: '' }
                        };
                      }
                      if (tc.id) accumulatedToolCalls[idx].id = tc.id;
                      if (tc.type) accumulatedToolCalls[idx].type = tc.type;
                      if (tc.function?.name) accumulatedToolCalls[idx].function.name = tc.function.name;
                      if (tc.function?.arguments) {
                        accumulatedToolCalls[idx].function.arguments += tc.function.arguments;
                      }
                    }
                  }

                  if (delta.content) {
                    accumulatedContent += delta.content;
                    if (onStreamChunk && accumulatedToolCalls.length === 0) {
                      onStreamChunk({ content: delta.content });
                    }
                  }
                }
              } catch (e) {
                // Ignore parse errors on invalid JSON chunks
              }
            }
          }
        });

        response.data.on('end', () => {
          const finalMessage = {
            role: 'assistant',
            content: accumulatedContent || null,
            tool_calls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls.filter(Boolean) : undefined
          };
          resolve(finalMessage);
        });

        response.data.on('error', (err) => {
          reject(err);
        });
      });
    }

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
