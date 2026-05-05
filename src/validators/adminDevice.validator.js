import { z } from 'zod';
import {
  deviceIdParamSchema,
  deviceIdRegex,
  deviceStatusValues,
  machineCodeRegex,
  optionalTrimmedString,
  paginationQuerySchema,
  pairingCodeRegex
} from './common.validator.js';

export const createAdminDeviceSchema = z.object({
  deviceId: optionalTrimmedString(100)
    .refine((value) => value === undefined || value.length >= 3, 'Device ID must be at least 3 characters.')
    .refine((value) => value === undefined || deviceIdRegex.test(value), 'Device ID can only contain letters, numbers, underscore and dash.'),
  machineCode: optionalTrimmedString(100)
    .transform((value) => value?.toUpperCase())
    .refine((value) => value === undefined || value.length >= 3, 'Machine code must be at least 3 characters.')
    .refine((value) => value === undefined || machineCodeRegex.test(value), 'Machine code format is invalid.'),
  pairingCode: optionalTrimmedString(100)
    .transform((value) => value?.toUpperCase())
    .refine((value) => value === undefined || value.length >= 3, 'Pairing code must be at least 3 characters.')
    .refine((value) => value === undefined || pairingCodeRegex.test(value), 'Pairing code format is invalid.'),
  deviceSecret: optionalTrimmedString(255)
    .refine((value) => value === undefined || value.length >= 8, 'Device secret must be at least 8 characters.'),
  firmwareVersion: optionalTrimmedString(50),
  status: z.enum(deviceStatusValues).optional().default('not_configured'),
  mqttServerId: z.coerce.number().int().positive().optional(),
  mqttUsername: optionalTrimmedString(150)
    .refine((value) => value === undefined || value.length >= 3, 'MQTT username must be at least 3 characters.'),
  mqttPassword: optionalTrimmedString(255)
    .refine((value) => value === undefined || value.length >= 8, 'MQTT password must be at least 8 characters.')
}).strict();

export const adminDeviceParamsSchema = deviceIdParamSchema;

export const listAdminDevicesQuerySchema = paginationQuerySchema.extend({
  status: z.enum(deviceStatusValues).optional(),
  ownerUserId: z.coerce.number().int().positive().optional(),
  q: z.string().trim().max(100, 'Search keyword must be at most 100 characters.').optional()
}).strict();

export const updateAdminDeviceSchema = z.object({
  displayName: optionalTrimmedString(255),
  machineCode: optionalTrimmedString(100)
    .transform((value) => value?.toUpperCase())
    .refine((value) => value === undefined || machineCodeRegex.test(value), 'Machine code format is invalid.'),
  firmwareVersion: optionalTrimmedString(50),
  status: z.enum(deviceStatusValues).optional()
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one field is required.');

export const transferOwnerSchema = z.object({
  ownerUserId: z.coerce.number().int().positive('Owner user ID must be a positive integer.')
}).strict();

export const linkAttemptsQuerySchema = paginationQuerySchema.strict();
