import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { askChatbotSchema } from '../validators/chatbot.validator.js';
import { askChatbot } from '../controllers/chatbot.controller.js';

const router = Router();

// POST /v1/chatbot
router.post('/', authenticate, validateBody(askChatbotSchema), asyncHandler(askChatbot));

export default router;
