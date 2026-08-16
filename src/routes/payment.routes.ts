import { Router, Request, Response, NextFunction } from 'express';
import express from 'express';
import { createOrder, verifyPayment, webhookHandler, getPaymentStatus } from '../controllers/payment.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOK ROUTE — must be declared BEFORE express.json() is applied
// Uses express.raw() to preserve the raw body needed for signature verification.
// This route is PUBLIC (no auth) — security is enforced via HMAC signature check.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/payment/webhook:
 *   post:
 *     summary: Razorpay webhook endpoint (server-to-server)
 *     tags: [Payment]
 *     description: >
 *       Receives payment events from Razorpay (payment.captured, payment.failed, order.paid).
 *       Secured via HMAC-SHA256 signature verification using RAZORPAY_WEBHOOK_SECRET.
 *       Do NOT add auth middleware to this route.
 *     responses:
 *       200:
 *         description: Webhook acknowledged
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }), // Preserve raw body for signature verification
  webhookHandler
);

// ─────────────────────────────────────────────────────────────────────────────
// PROTECTED ROUTES — require JWT authentication
// ─────────────────────────────────────────────────────────────────────────────
router.use(authMiddleware);

/**
 * @swagger
 * /api/v1/payment/create-order:
 *   post:
 *     summary: Create a Razorpay payment order
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId]
 *             properties:
 *               bookingId:
 *                 type: string
 *                 description: MongoDB ObjectId of the booking to pay for
 *     responses:
 *       201:
 *         description: Razorpay order created. Returns orderId, amount, currency, keyId.
 *       400:
 *         description: Invalid booking or already paid
 *       403:
 *         description: Access denied
 *       404:
 *         description: Booking not found
 */
router.post('/create-order', createOrder);

/**
 * @swagger
 * /api/v1/payment/verify:
 *   post:
 *     summary: Verify Razorpay payment signature
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     description: >
 *       Called after the Razorpay checkout modal completes. Verifies the HMAC-SHA256
 *       signature on the server. On success, marks booking as PAID + APPROVED.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId]
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
 *         description: Payment verified and booking updated
 *       400:
 *         description: Invalid signature or missing fields
 */
router.post('/verify', verifyPayment);

/**
 * @swagger
 * /api/v1/payment/status/{bookingId}:
 *   get:
 *     summary: Get payment status for a booking
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment and booking status
 *       403:
 *         description: Access denied
 *       404:
 *         description: Booking not found
 */
router.get('/status/:bookingId', getPaymentStatus);

export default router;
