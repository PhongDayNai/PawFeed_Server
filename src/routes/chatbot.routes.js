import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { askChatbotSchema } from '../validators/chatbot.validator.js';
import { askChatbot, getChatHistory, initChatbotSession } from '../controllers/chatbot.controller.js';

const router = Router();

// POST /v1/chatbot/init
router.post('/init', authenticate, asyncHandler(initChatbotSession));

// POST /v1/chatbot
router.post('/', authenticate, validateBody(askChatbotSchema), asyncHandler(askChatbot));

// GET /v1/chatbot/history
router.get('/history', authenticate, asyncHandler(getChatHistory));

export default router;
