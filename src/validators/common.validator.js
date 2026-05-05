import { z } from 'zod';

export const deviceIdRegex = /^[A-Za-z0-9_-]+$/;
export const machineCodeRegex = /^[A-Za-z0-9_-]+(?:-[A-Za-z0-9_-]+)*$/;
export const pairingCodeRegex = /^[A-Za-z0-9_-]+(?:-[A-Za-z0-9_-]+)*$/;

export const deviceStatusValues = [
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

export function optionalTrimmedString(maxLength, message = `Must be at most ${maxLength} characters.`) {
  return z.string().trim().max(maxLength, message).optional();
}

export const deviceIdParamSchema = z.object({
  deviceId: z
    .string()
    .trim()
    .min(1, 'Device ID is required.')
    .max(100, 'Device ID must be at most 100 characters.')
});

export const paginationQuerySchema = z.object({
  page: z.coerce
    .number({ invalid_type_error: 'Page must be a number.' })
    .int('Page must be an integer.')
    .positive('Page must be greater than 0.')
    .optional()
    .default(1),
  limit: z.coerce
    .number({ invalid_type_error: 'Limit must be a number.' })
    .int('Limit must be an integer.')
    .positive('Limit must be greater than 0.')
    .max(100, 'Limit must be at most 100.')
    .optional()
    .default(20)
});

export const machineCodeSchema = z
  .string()
  .trim()
  .min(1, 'Machine code is required.')
  .max(100, 'Machine code must be at most 100 characters.')
  .transform((value) => value.toUpperCase())
  .refine((value) => machineCodeRegex.test(value), 'Machine code format is invalid.');

export const pairingCodeSchema = z
  .string()
  .trim()
  .min(1, 'Pairing code is required.')
  .max(100, 'Pairing code must be at most 100 characters.')
  .transform((value) => value.toUpperCase())
  .refine((value) => pairingCodeRegex.test(value), 'Pairing code format is invalid.');
