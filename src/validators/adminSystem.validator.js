import { z } from 'zod';
import { optionalTrimmedString, paginationQuerySchema } from './common.validator.js';

export const listAuditLogsQuerySchema = paginationQuerySchema.extend({
  actorUserId: z.coerce.number().int().positive().optional(),
  action: z.string().trim().max(100).optional(),
  targetType: z.string().trim().max(100).optional(),
  targetId: z.string().trim().max(100).optional(),
  from: z.string().trim().max(40).optional(),
  to: z.string().trim().max(40).optional()
}).strict();

export const patchSystemSettingsSchema = z.object({
  settings: z.array(z.object({
    key: z.string().trim().min(1).max(100),
    value: z.any(),
    description: optionalTrimmedString(255)
  }).strict()).min(1).max(50).optional(),
  provider: z.object({
    name: optionalTrimmedString(255),
    brand: optionalTrimmedString(255),
    website: optionalTrimmedString(255),
    contact: optionalTrimmedString(255),
    note: optionalTrimmedString(1000)
  }).strict().optional(),
  serverDefaults: z.object({
    configFileTtlSec: z.coerce.number().int().positive().optional(),
    defaultTimezone: optionalTrimmedString(100),
    defaultTimezoneOffsetSec: z.coerce.number().int().optional(),
    defaultKeepSetupApEnabled: z.boolean().optional(),
    defaultMqttUseTls: z.boolean().optional()
  }).strict().optional()
}).strict().refine((value) => value.settings || value.provider || value.serverDefaults, 'At least one setting group is required.');
