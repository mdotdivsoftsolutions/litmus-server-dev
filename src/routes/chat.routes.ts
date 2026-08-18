import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { authMiddleware, adminMiddleware, optionalAuthMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Public / Guest / User accessible endpoints
router.post('/bot-query', ChatController.queryBot);
router.get('/presence', ChatController.getPresence);
router.get('/canned-responses', ChatController.getCannedResponses);
router.get('/sessions/:sessionId/messages', optionalAuthMiddleware, ChatController.getMessages);

// Admin & Employee protected routes
router.use(authMiddleware, adminMiddleware);

router.get('/sessions', ChatController.getSessions);
router.get('/sessions/:sessionId', ChatController.getSessionById);
router.post('/sessions/:sessionId/notes', ChatController.addNote);

export default router;
