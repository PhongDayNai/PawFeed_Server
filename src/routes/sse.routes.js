import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { eventsStream } from '../controllers/sse.controller.js';

const router = Router();

// GET /v1/events/stream
// Requires authentication - streams SSE events to client
router.get('/stream', authenticate, eventsStream);

export default router;
