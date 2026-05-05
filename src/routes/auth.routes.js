import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { authRateLimiter } from '../middleware/rateLimits.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  changePasswordSchema
} from '../validators/auth.validator.js';
import {
  changePassword,
  login,
  logout,
  me,
  refresh,
  register
} from '../controllers/auth.controller.js';

const router = Router();

router.post('/auth/register', authRateLimiter, validateBody(registerSchema), asyncHandler(register));
router.post('/auth/login', authRateLimiter, validateBody(loginSchema), asyncHandler(login));
router.post('/auth/refresh', authRateLimiter, validateBody(refreshSchema), asyncHandler(refresh));
router.post('/auth/logout', authenticate, asyncHandler(logout));
router.get('/auth/me', authenticate, asyncHandler(me));
router.post('/auth/change-password', authenticate, authRateLimiter, validateBody(changePasswordSchema), asyncHandler(changePassword));

export default router;
