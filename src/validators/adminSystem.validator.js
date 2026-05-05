import { z } from 'zod';
import { optionalTrimmedString, paginationQuerySchema } from './common.validator.js';

const auditRoleSchema = z.enum(['user', 'admin', 'technician']).optional();
const auditTextFilter = z.string().trim().min(1).max(100).optional();
const auditDateFilter = z.string().trim().min(1).max(40).optional();

export const listAuditLogsQuerySchema = paginationQuerySchema.extend({
  actorUserId: z.coerce.number().int().positive().optional(),
  actorRole: auditRoleSchema,
  actorEmail: z.string().trim().min(1).max(255).optional(),
  action: auditTextFilter,
  actionPrefix: auditTextFilter,
  targetType: auditTextFilter,
  targetId: auditTextFilter,
  clientIp: z.string().trim().min(1).max(100).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  from: auditDateFilter,
  to: auditDateFilter
}).strict();

export const exportAuditLogsQuerySchema = listAuditLogsQuerySchema.extend({
  limit: z.coerce.number().int().positive().max(5000).optional().default(1000)
}).strict();

const providerSchema = z.object({
  name: optionalTrimmedString(255),
  brand: optionalTrimmedString(255),
  website: optionalTrimmedString(255),
  contact: optionalTrimmedString(255),
  note: optionalTrimmedString(1000)
}).strict();

const serverDefaultsSchema = z.object({
  configFileTtlSec: z.coerce.number().int().positive().max(604800).optional(),
  defaultTimezone: optionalTrimmedString(100),
  defaultTimezoneOffsetSec: z.coerce.number().int().min(-43200).max(50400).optional(),
  defaultKeepSetupApEnabled: z.boolean().optional(),
  defaultMqttUseTls: z.boolean().optional(),
  allowDemoKeepSetupAp: z.boolean().optional()
}).strict();

const workerTimeoutsSchema = z.object({
  deviceOnlineTtlSec: z.coerce.number().int().positive().max(86400).optional(),
  commandAckTimeoutSec: z.coerce.number().int().positive().max(86400).optional(),
  commandCompleteTimeoutSec: z.coerce.number().int().positive().max(86400).optional()
}).strict();

export const patchSystemSettingsSchema = z.object({
  settings: z.array(z.object({
    key: z.string().trim().min(1).max(100),
    value: z.any(),
    description: optionalTrimmedString(255)
  }).strict()).min(1).max(50).optional(),

  provider: providerSchema.optional(),
  serverDefaults: serverDefaultsSchema.optional(),
  workerTimeouts: workerTimeoutsSchema.optional(),

  // Spec-friendly flat fields for PATCH /api/admin/system-settings.
  configFileTtlSec: z.coerce.number().int().positive().max(604800).optional(),
  deviceOnlineTtlSec: z.coerce.number().int().positive().max(86400).optional(),
  commandAckTimeoutSec: z.coerce.number().int().positive().max(86400).optional(),
  commandCompleteTimeoutSec: z.coerce.number().int().positive().max(86400).optional(),
  defaultTimezone: optionalTrimmedString(100),
  defaultTimezoneOffsetSec: z.coerce.number().int().min(-43200).max(50400).optional(),
  defaultKeepSetupApEnabled: z.boolean().optional(),
  defaultMqttUseTls: z.boolean().optional(),
  allowDemoKeepSetupAp: z.boolean().optional()
}).strict().refine((value) => (
  value.settings ||
  value.provider ||
  value.serverDefaults ||
  value.workerTimeouts ||
  value.configFileTtlSec !== undefined ||
  value.deviceOnlineTtlSec !== undefined ||
  value.commandAckTimeoutSec !== undefined ||
  value.commandCompleteTimeoutSec !== undefined ||
  value.defaultTimezone !== undefined ||
  value.defaultTimezoneOffsetSec !== undefined ||
  value.defaultKeepSetupApEnabled !== undefined ||
  value.defaultMqttUseTls !== undefined ||
  value.allowDemoKeepSetupAp !== undefined
), 'At least one setting group is required.');
