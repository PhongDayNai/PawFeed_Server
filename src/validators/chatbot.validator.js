import { z } from 'zod';

export const chatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().trim().min(1, 'Message content cannot be empty.')
});

export const askChatbotSchema = z.object({
  messages: z.array(chatMessageSchema).min(1, 'Messages array must contain at least one message.'),
  model: z.string().trim().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  clientMsgId: z.string().uuid('clientMsgId must be a valid UUID.').optional()
}).strict();
