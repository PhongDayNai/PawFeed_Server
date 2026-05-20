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
      .min(100, 'Open duration must be at least 100 ms.')
      .max(600000, 'Open duration must be at most 600000 ms.'),
    daysOfWeek: z
      .array(z.number().int().min(0).max(6))
      .min(1, 'At least one day must be specified.')
      .optional()
      .default([0, 1, 2, 3, 4, 5, 6])
  })
  .strict();

export const saveScheduleSchema = z
  .object({
    enabled: z.boolean().optional().default(true),
    timezone: timezoneSchema.optional(),
    timezoneOffsetSec: timezoneOffsetSecSchema.optional(),
    entries: z.array(scheduleItemSchema).max(8, 'Schedule can contain at most 8 entries.').optional().default([])
  })
  .strict()
  .superRefine((value, ctx) => {
    const entries = value.entries || [];
    const timesByDay = new Map();

    entries.forEach((item, index) => {
      const days = item.daysOfWeek || [0, 1, 2, 3, 4, 5, 6];
      days.forEach((day) => {
        const key = `${day}-${item.time}`;
        if (timesByDay.has(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicated schedule entry: ${item.time} on day ${day}.`,
            path: ['entries', index, 'time']
          });
          return;
        }
        timesByDay.set(key, index);
      });
    });
  });
