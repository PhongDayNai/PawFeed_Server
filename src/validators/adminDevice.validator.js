import { z } from 'zod';

const deviceIdRegex = /^[A-Za-z0-9_-]+$/;
const machineCodeRegex = /^[A-Za-z0-9_-]+(?:-[A-Za-z0-9_-]+)*$/;
const pairingCodeRegex = /^[A-Za-z0-9_-]+(?:-[A-Za-z0-9_-]+)*$/;

const deviceStatusValues = [
  'not_configured',
  'linked',
  'config_generated',
  'configured',
  'online',
  'offline',
  'disabled',
  'revoked',
  'unlinked'
];

function optionalTrimmedString(maxLength) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .optional();
}

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
});

export const adminDeviceParamsSchema = z.object({
  deviceId: z.string().trim().min(1).max(100)
});

export const listAdminDevicesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  status: z.enum(deviceStatusValues).optional(),
  ownerUserId: z.coerce.number().int().positive().optional(),
  q: z.string().trim().max(100).optional()
});
