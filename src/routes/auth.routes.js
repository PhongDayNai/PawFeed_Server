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

router.post('/register', authRateLimiter, validateBody(registerSchema), asyncHandler(register));
router.post('/login', authRateLimiter, validateBody(loginSchema), asyncHandler(login));
router.post('/refresh', authRateLimiter, validateBody(refreshSchema), asyncHandler(refresh));
router.post('/logout', authenticate, asyncHandler(logout));
router.get('/me', authenticate, asyncHandler(me));
router.post('/change-password', authenticate, authRateLimiter, validateBody(changePasswordSchema), asyncHandler(changePassword));

export default router;
