import { z } from 'zod';
import { optionalTrimmedString, paginationQuerySchema } from './common.validator.js';

export const adminUserParamsSchema = z.object({
  userId: z.coerce.number().int().positive('User ID must be a positive integer.')
}).strict();

export const listAdminUsersQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  role: z.enum(['user', 'admin', 'technician']).optional()
}).strict();

export const updateAdminUserSchema = z.object({
  fullName: optionalTrimmedString(255),
  role: z.enum(['user', 'admin', 'technician']).optional(),
  email: z.string().trim().email('Email is invalid.').max(255).optional()
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one field is required.');

export const resetAdminUserPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters.').max(255).optional()
}).strict();
