import { z } from 'zod';
import { paginationQuerySchema } from './common.validator.js';

export const adminChatbotWikiParamsSchema = z.object({
  id: z.coerce.number().int().positive('Wiki entry ID must be a positive integer.')
}).strict();

export const listAdminChatbotWikiQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(100).optional()
}).strict();

export const createAdminChatbotWikiSchema = z.object({
  keyword: z.string().trim().min(1, 'Keyword is required.').max(255, 'Keyword must be at most 255 characters.'),
  content: z.string().trim().min(1, 'Content is required.')
}).strict();

export const updateAdminChatbotWikiSchema = z.object({
  keyword: z.string().trim().min(1, 'Keyword must be at least 1 character.').max(255, 'Keyword must be at most 255 characters.').optional(),
  content: z.string().trim().min(1, 'Content must be at least 1 character.').optional()
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one field is required.');
