import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { updateProfileSchema } from '../validators/account.validator.js';
import { updateProfile } from '../controllers/account.controller.js';

const router = Router();

router.patch('/account/profile', authenticate, validateBody(updateProfileSchema), asyncHandler(updateProfile));

export default router;
