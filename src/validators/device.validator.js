import { z } from 'zod';
import { deviceIdParamSchema, machineCodeSchema, pairingCodeSchema } from './common.validator.js';

export const linkDeviceSchema = z.object({
  machineCode: machineCodeSchema,
  pairingCode: pairingCodeSchema
}).strict();

export const deviceParamsSchema = deviceIdParamSchema;

export const updateUserDeviceSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Display name must not be empty.')
    .max(255, 'Display name must be at most 255 characters.')
    .nullable()
    .optional()
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required.'
});
