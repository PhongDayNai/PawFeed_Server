import { z } from 'zod';
import { deviceIdParamSchema, deviceStatusValues, machineCodeSchema, pairingCodeSchema } from './common.validator.js';
import { paginationQuerySchema } from './pagination.validator.js';

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


const optionalBooleanQuerySchema = z
  .preprocess((value) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value === true || value === 'true' || value === '1') return true;
    if (value === false || value === 'false' || value === '0') return false;
    return value;
  }, z.boolean().optional());

export const listUserDevicesQuerySchema = paginationQuerySchema
  .extend({
    status: z.enum(deviceStatusValues).optional(),
    online: optionalBooleanQuerySchema,
    search: z.string().trim().min(1).max(100).optional()
  })
  .strict();
