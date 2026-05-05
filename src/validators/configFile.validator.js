import { z } from 'zod';
import {
  optionalAddressNoteSchema,
  optionalAddressSchema,
  timezoneOffsetSecSchema,
  timezoneSchema,
  wifiPasswordSchema,
  wifiSsidSchema
} from './config.validator.js';
import { scheduleItemSchema } from './schedule.validator.js';

const configFileScheduleItemSchema = scheduleItemSchema.extend({
  id: z.string().trim().min(1).max(100).optional(),
  mealId: z.string().trim().min(1).max(100).optional(),
  mealOrder: z.coerce.number().int().min(1).max(8).optional()
});

const feedingScheduleSchema = z
  .object({
    enabled: z.boolean().optional().default(true),
    items: z.array(configFileScheduleItemSchema).max(8, 'Schedule can contain at most 8 items.').optional().default([])
  })
  .strict()
  .superRefine((value, ctx) => {
    const enabledTimes = new Map();

    value.items.forEach((item, index) => {
      if (!item.enabled) return;
      if (enabledTimes.has(item.time)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicated enabled schedule time: ${item.time}.`,
          path: ['items', index, 'time']
        });
      }
      enabledTimes.set(item.time, index);
    });
  });

export const configFileQuerySchema = z
  .object({
    mode: z.enum(['json']).optional()
  })
  .strict();

export const createConfigFileSchema = z
  .object({
    wifiSsid: wifiSsidSchema,
    wifiPassword: wifiPasswordSchema,
    address: optionalAddressSchema,
    addressNote: optionalAddressNoteSchema,
    timezone: timezoneSchema.optional(),
    timezoneOffsetSec: timezoneOffsetSecSchema.optional(),
    keepSetupApEnabled: z.boolean().optional(),
    feedingSchedule: feedingScheduleSchema.optional().default({ enabled: false, items: [] })
  })
  .strict();
