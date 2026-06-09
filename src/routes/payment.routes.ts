import { Router } from 'express';
import { createOrder, verifyPayment } from '../controllers/payment.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Protect payment routes
router.use(authMiddleware);

/**
 * @swagger
 * /api/v1/payment/create-order:
 *   post:
 *     summary: Create a new payment order
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bookingId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment order created
 */
router.post('/create-order', createOrder);

/**
 * @swagger
 * /api/v1/payment/verify:
 *   post:
 *     summary: Verify a payment
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               razorpay_order_id:
 *                 type: string
 *               razorpay_payment_id:
 *                 type: string
 *               razorpay_signature:
 *                 type: string
 *               bookingId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment verified successfully
 */
router.post('/verify', verifyPayment);

export default router;
