import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getDashboard } from '../controllers/dashboard.controller.js';

const router = Router();

router.get('/', authenticate, asyncHandler(getDashboard));

export default router;
