import { z } from 'zod';

export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Full name cannot be empty.')
    .max(255, 'Full name is too long.')
    .nullable()
});
