import { z } from 'zod';

const fullNameSchema = z
  .string()
  .trim()
  .min(1, 'Full name cannot be empty.')
  .max(255, 'Full name is too long.')
  .optional()
  .nullable();

const emailSchema = z
  .string()
  .trim()
  .email('Email must be valid.')
  .max(255, 'Email is too long.')
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(255, 'Password is too long.');

export const registerSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  password: passwordSchema
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.').max(255, 'Password is too long.')
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required.')
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.').max(255),
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(8).max(255).optional()
  })
  .superRefine((value, ctx) => {
    if (value.confirmNewPassword !== undefined && value.newPassword !== value.confirmNewPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmNewPassword'],
        message: 'Confirm password does not match new password.'
      });
    }
  });
