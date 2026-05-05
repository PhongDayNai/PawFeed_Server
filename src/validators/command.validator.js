import { z } from 'zod';
import { deviceIdParamSchema } from './common.validator.js';
import { paginationQuerySchema } from './pagination.validator.js';

export const COMMAND_STATUS_VALUES = [
  'pending',
  'published',
  'accepted',
  'rejected',
  'completed',
  'failed',
  'timeout'
];

export const COMMAND_ACTION_VALUES = ['feed_once'];

export const feedNowBodySchema = z
  .object({
    openDurationMs: z.coerce
      .number({ invalid_type_error: 'Open duration must be a number.' })
      .int('Open duration must be an integer.')
      .min(300, 'Open duration must be at least 300 ms.')
      .max(10000, 'Open duration must be at most 10000 ms.')
  })
  .strict();

export const commandParamsSchema = deviceIdParamSchema.extend({
  requestId: z
    .string()
    .trim()
    .min(1, 'Request ID is required.')
    .max(100, 'Request ID must be at most 100 characters.')
});

export const listCommandsQuerySchema = paginationQuerySchema
  .extend({
    status: z.enum(COMMAND_STATUS_VALUES).optional(),
    action: z.enum(COMMAND_ACTION_VALUES).optional()
  })
  .strict();

export const listAdminCommandsQuerySchema = paginationQuerySchema
  .extend({
    deviceId: z.string().trim().min(1).max(100).optional(),
    requestId: z.string().trim().min(1).max(100).optional(),
    status: z.enum(COMMAND_STATUS_VALUES).optional(),
    action: z.enum(COMMAND_ACTION_VALUES).optional(),
    from: z.string().trim().min(1).max(40).optional(),
    to: z.string().trim().min(1).max(40).optional()
  })
  .strict();
