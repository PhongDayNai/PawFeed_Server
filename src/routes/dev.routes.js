import { Router } from 'express';
import { AppError } from '../utils/errors.js';

const router = Router();

router.get('/error', () => {
  throw new AppError('This is a test error from Phase 0.', 500, 'TEST_INTERNAL_ERROR');
});

export default router;
