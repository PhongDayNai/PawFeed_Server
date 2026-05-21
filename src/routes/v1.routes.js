import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import accountRoutes from './account.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import deviceRoutes from './device.routes.js';
import adminRoutes from './admin.routes.js';
import sseRoutes from './sse.routes.js';

const router = Router();

router.use(healthRoutes);
router.use('/auth', authRoutes);
router.use('/account', accountRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/devices', deviceRoutes);
router.use('/admin', adminRoutes);
router.use('/events', sseRoutes);

export default router;