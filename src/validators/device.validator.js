import { z } from 'zod';

const machineCodeRegex = /^[A-Za-z0-9_-]+(?:-[A-Za-z0-9_-]+)*$/;
const pairingCodeRegex = /^[A-Za-z0-9_-]+(?:-[A-Za-z0-9_-]+)*$/;

export const linkDeviceSchema = z.object({
  machineCode: z
    .string()
    .trim()
    .min(1, 'Machine code is required.')
    .max(100, 'Machine code must be at most 100 characters.')
    .transform((value) => value.toUpperCase())
    .refine((value) => machineCodeRegex.test(value), 'Machine code format is invalid.'),
  pairingCode: z
    .string()
    .trim()
    .min(1, 'Pairing code is required.')
    .max(100, 'Pairing code must be at most 100 characters.')
    .transform((value) => value.toUpperCase())
    .refine((value) => pairingCodeRegex.test(value), 'Pairing code format is invalid.')
});

export const deviceParamsSchema = z.object({
  deviceId: z.string().trim().min(1).max(100)
});

export const updateUserDeviceSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Display name must not be empty.')
    .max(255, 'Display name must be at most 255 characters.')
    .nullable()
    .optional()
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required.'
});
