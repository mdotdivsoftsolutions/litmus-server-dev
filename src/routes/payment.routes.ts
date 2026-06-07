import { Router } from 'express';
import { createOrder, verifyPayment } from '../controllers/payment.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Protect payment routes
router.use(authMiddleware);

router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);

export default router;
