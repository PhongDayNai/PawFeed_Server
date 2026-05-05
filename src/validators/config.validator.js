import { z } from 'zod';

export const timezoneSchema = z
  .string()
  .trim()
  .min(1, 'Timezone is required.')
  .max(100, 'Timezone must be at most 100 characters.')
  .default('Asia/Bangkok');

export const timezoneOffsetSecSchema = z.coerce
  .number({ invalid_type_error: 'Timezone offset must be a number.' })
  .int('Timezone offset must be an integer.')
  .min(-43200, 'Timezone offset must be at least -43200 seconds.')
  .max(50400, 'Timezone offset must be at most 50400 seconds.')
  .default(25200);

export const wifiSsidSchema = z
  .string()
  .trim()
  .min(1, 'Wi-Fi SSID is required.')
  .max(255, 'Wi-Fi SSID must be at most 255 characters.');

export const wifiPasswordSchema = z
  .string()
  .max(255, 'Wi-Fi password must be at most 255 characters.')
  .nullable()
  .optional();

export const optionalAddressSchema = z
  .string()
  .trim()
  .max(1000, 'Address must be at most 1000 characters.')
  .nullable()
  .optional();

export const optionalAddressNoteSchema = z
  .string()
  .trim()
  .max(1000, 'Address note must be at most 1000 characters.')
  .nullable()
  .optional();

export const saveCurrentConfigSchema = z
  .object({
    wifiSsid: wifiSsidSchema,
    wifiPassword: wifiPasswordSchema,
    address: optionalAddressSchema,
    addressNote: optionalAddressNoteSchema,
    timezone: timezoneSchema.optional(),
    timezoneOffsetSec: timezoneOffsetSecSchema.optional(),
    keepSetupApEnabled: z.boolean().optional().default(false)
  })
  .strict();
