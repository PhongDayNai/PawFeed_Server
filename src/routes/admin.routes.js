import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { adminPing } from '../controllers/admin.controller.js';

const router = Router();

router.get('/admin/ping', authenticate, requireRole(['admin']), asyncHandler(adminPing));

export default router;
