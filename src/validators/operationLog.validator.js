import { z } from 'zod';
import { deviceIdParamSchema } from './common.validator.js';
import { paginationQuerySchema } from './pagination.validator.js';

export const CONFIG_GENERATION_STATUS_VALUES = [
  'generated',
  'downloaded',
  'applied',
  'expired',
  'revoked',
  'failed'
];

export const FEEDING_HISTORY_SOURCE_VALUES = ['remote', 'schedule', 'manual', 'test'];
export const FEEDING_HISTORY_STATUS_VALUES = ['completed', 'failed', 'timeout', 'cancelled'];

const optionalShortText = z.string().trim().min(1).max(100).optional();
const optionalDateText = z.string().trim().min(1).max(40).optional();

export const listDeviceEventsQuerySchema = paginationQuerySchema
  .extend({
    eventType: optionalShortText,
    source: z.string().trim().min(1).max(50).optional(),
    requestId: optionalShortText,
    configId: optionalShortText,
    from: optionalDateText,
    to: optionalDateText
  })
  .strict();

export const listAdminDeviceEventsQuerySchema = listDeviceEventsQuerySchema
  .extend({
    deviceId: z.string().trim().min(1).max(100).optional()
  })
  .strict();

export const listFeedingHistoryQuerySchema = paginationQuerySchema
  .extend({
    source: z.enum(FEEDING_HISTORY_SOURCE_VALUES).optional(),
    status: z.enum(FEEDING_HISTORY_STATUS_VALUES).optional(),
    requestId: optionalShortText,
    scheduleId: optionalShortText,
    from: optionalDateText,
    to: optionalDateText
  })
  .strict();

export const listAdminFeedingHistoriesQuerySchema = listFeedingHistoryQuerySchema
  .extend({
    deviceId: z.string().trim().min(1).max(100).optional()
  })
  .strict();

export const listConfigGenerationsQuerySchema = paginationQuerySchema
  .extend({
    configId: optionalShortText,
    status: z.enum(CONFIG_GENERATION_STATUS_VALUES).optional(),
    from: optionalDateText,
    to: optionalDateText
  })
  .strict();

export const listAdminConfigGenerationsQuerySchema = listConfigGenerationsQuerySchema
  .extend({
    deviceId: z.string().trim().min(1).max(100).optional()
  })
  .strict();

export const configGenerationParamsSchema = z
  .object({
    configId: z.string().trim().min(1, 'Config ID is required.').max(100, 'Config ID must be at most 100 characters.')
  })
  .strict();

export const userDeviceLogParamsSchema = deviceIdParamSchema;
