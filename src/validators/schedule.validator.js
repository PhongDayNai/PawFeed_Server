import { z } from 'zod';
import { timezoneOffsetSecSchema, timezoneSchema } from './config.validator.js';

export function isStrictTimeOfDay(value) {
  if (typeof value !== 'string' || value.length !== 5 || value[2] !== ':') {
    return false;
  }

  const hourText = value.slice(0, 2);
  const minuteText = value.slice(3, 5);

  if (!/^\d{2}$/.test(hourText) || !/^\d{2}$/.test(minuteText)) {
    return false;
  }

  const hour = Number(hourText);
  const minute = Number(minuteText);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export const scheduleItemSchema = z
  .object({
    time: z
      .string()
      .trim()
      .refine(isStrictTimeOfDay, 'Time must use strict HH:mm format.'),
    openDurationMs: z.coerce
      .number({ invalid_type_error: 'Open duration must be a number.' })
      .int('Open duration must be an integer.')
      .min(300, 'Open duration must be between 300 and 10000 ms.')
      .max(10000, 'Open duration must be between 300 and 10000 ms.'),
    enabled: z.boolean().optional().default(true)
  })
  .strict();

export const saveScheduleSchema = z
  .object({
    enabled: z.boolean().optional().default(true),
    timezone: timezoneSchema.optional(),
    timezoneOffsetSec: timezoneOffsetSecSchema.optional(),
    items: z.array(scheduleItemSchema).max(8, 'Schedule can contain at most 8 items.').optional().default([])
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
        return;
      }

      enabledTimes.set(item.time, index);
    });
  });
