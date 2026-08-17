import { Request, Response } from 'express';
import crypto from 'crypto';
import { razorpay } from '../config/razorpay';
import Booking from '../models/Booking';
import Payment from '../models/Payment';
import { PaymentStatus, BookingStatus } from '../types';
import { generateInvoiceNumber } from '../services/invoice.service';
import logger from '../utils/logger';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/payment/create-order
// Protected: requires auth (user must own the booking)
// Creates a Razorpay order server-side. Amount is ALWAYS taken from the DB
// (booking.totalAmount) — frontend can never tamper the amount.
// ─────────────────────────────────────────────────────────────────────────────
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookingId } = req.body;
    const userId = (req as any).user?.id;

    if (!bookingId) {
      res.status(400).json({ success: false, message: 'bookingId is required' });
      return;
    }

    // Fetch booking and make sure it belongs to the requesting user
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    if (booking.userId.toString() !== userId) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    // Reject if already paid
    if (booking.paymentStatus === PaymentStatus.SUCCESS) {
      res.status(400).json({ success: false, message: 'This booking is already paid' });
      return;
    }

    // SECURITY: Amount is taken from server-side DB — never from request body
    const totalAmount = booking.totalAmount;
    if (!totalAmount || totalAmount <= 0) {
      res.status(400).json({
        success: false,
        message: 'Invalid booking amount. Cannot create payment order.',
      });
      return;
    }

    // Create Razorpay order (amount in paise = totalAmount * 100)
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100), // paise
      currency: 'INR',
      receipt: `rcpt_${bookingId.toString().slice(-10)}`,
      notes: {
        bookingId: bookingId.toString(),
        userId: userId,
      },
    });

    // Upsert a Payment record so we can track the order
    await Payment.findOneAndUpdate(
      { bookingId },
      {
        bookingId,
        amount: totalAmount,
        transactionId: razorpayOrder.id,
        status: PaymentStatus.PENDING,
        method: 'RAZORPAY',
        metadata: { razorpay_order_id: razorpayOrder.id },
      },
      { upsert: true, new: true }
    );

    logger.info(`Razorpay order created: ${razorpayOrder.id} for booking: ${bookingId}`);

    res.status(201).json({
      success: true,
      data: {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount, // in paise
        currency: razorpayOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID, // public key — safe to send
        bookingId: bookingId.toString(),
      },
    });
  } catch (error: any) {
    logger.error(`createOrder error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to create payment order', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/payment/verify
// Protected: requires auth
// Called by frontend after Razorpay checkout completes successfully.
// Verifies the HMAC-SHA256 signature — if valid, marks booking as PAID.
// ─────────────────────────────────────────────────────────────────────────────
export const verifyPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId) {
      res.status(400).json({ success: false, message: 'Missing payment verification details' });
      return;
    }

    // ── HMAC-SHA256 Signature Verification ──────────────────────────────────
    // Razorpay signs: "<order_id>|<payment_id>" with the key secret
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    // Use timingSafeEqual to prevent timing attacks
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const receivedBuffer = Buffer.from(razorpay_signature, 'hex');

    const isValid =
      expectedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

    if (!isValid) {
      logger.warn(`Invalid Razorpay signature for order: ${razorpay_order_id}`);
      res.status(400).json({ success: false, message: 'Payment verification failed: invalid signature' });
      return;
    }
    // ────────────────────────────────────────────────────────────────────────

    // Mark Payment as SUCCESS (upsert ensures record is always present)
    const payment = await Payment.findOneAndUpdate(
      { $or: [{ transactionId: razorpay_order_id }, { bookingId }] },
      {
        bookingId,
        transactionId: razorpay_order_id,
        status: PaymentStatus.SUCCESS,
        method: 'RAZORPAY',
        metadata: {
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          verifiedAt: new Date().toISOString(),
        },
      },
      { upsert: true, new: true }
    );

    // Update Booking paymentStatus + booking status to APPROVED and ensure invoiceNumber is assigned
    const existingBooking = await Booking.findById(bookingId);
    const invoiceNum = existingBooking?.invoiceNumber || generateInvoiceNumber(bookingId, existingBooking?.bookingDate || new Date());
    
    await Booking.findByIdAndUpdate(bookingId, {
      paymentStatus: PaymentStatus.SUCCESS,
      status: BookingStatus.APPROVED,
      invoiceNumber: invoiceNum,
      invoiceDate: existingBooking?.invoiceDate || new Date(),
    });

    logger.info(`Payment verified: ${razorpay_payment_id} for booking: ${bookingId}, Invoice: ${invoiceNum}`);

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: { bookingId, paymentId: razorpay_payment_id },
    });
  } catch (error: any) {
    logger.error(`verifyPayment error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to verify payment', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/payment/webhook
// PUBLIC (no auth) — but signature-verified using RAZORPAY_WEBHOOK_SECRET
// Server-to-server callback from Razorpay. Acts as the safety net:
// even if the user closes the browser after paying, this guarantees the
// booking gets marked as PAID in the DB.
// ─────────────────────────────────────────────────────────────────────────────
export const webhookHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    const razorpaySignature = req.headers['x-razorpay-signature'] as string;

    // ── Webhook Signature Verification ──────────────────────────────────────
    const rawBody = req.body as Buffer;
    if (webhookSecret) {
      if (!razorpaySignature) {
        logger.warn('Webhook received without signature header');
        res.status(400).json({ success: false, message: 'Missing webhook signature' });
        return;
      }

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      const receivedBuffer = Buffer.from(razorpaySignature, 'hex');

      const isValid =
        expectedBuffer.length === receivedBuffer.length &&
        crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

      if (!isValid) {
        logger.warn('Invalid webhook signature — possible fake webhook attempt');
        res.status(400).json({ success: false, message: 'Invalid webhook signature' });
        return;
      }
    } else {
      logger.warn('RAZORPAY_WEBHOOK_SECRET is not configured in .env. Skipping signature verification.');
    }
    // ────────────────────────────────────────────────────────────────────────

    let event: any;
    try {
      event = typeof req.body === 'string' 
        ? JSON.parse(req.body) 
        : Buffer.isBuffer(req.body) 
          ? JSON.parse(req.body.toString('utf8')) 
          : req.body;
    } catch (e) {
      event = req.body;
    }

    const eventType: string = event?.event || '';

    logger.info(`Razorpay webhook received: ${eventType}`);

    // Handle payment captured / order paid
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderEntity = event.payload?.order?.entity;

      const razorpay_order_id: string = paymentEntity?.order_id || orderEntity?.id || '';
      const razorpay_payment_id: string = paymentEntity?.id || '';
      const bookingId: string = paymentEntity?.notes?.bookingId || orderEntity?.notes?.bookingId || '';

      // Idempotent update — safe to call multiple times
      const query = razorpay_order_id 
        ? (bookingId ? { $or: [{ transactionId: razorpay_order_id }, { bookingId }] } : { transactionId: razorpay_order_id })
        : (bookingId ? { bookingId } : null);

      let targetBookingId = bookingId;

      if (query) {
        const payment = await Payment.findOneAndUpdate(
          query,
          {
            ...(bookingId ? { bookingId } : {}),
            ...(razorpay_order_id ? { transactionId: razorpay_order_id } : {}),
            status: PaymentStatus.SUCCESS,
            method: 'RAZORPAY',
            metadata: {
              razorpay_order_id,
              razorpay_payment_id,
              webhookEvent: eventType,
              webhookAt: new Date().toISOString(),
            },
          },
          { new: true, upsert: Boolean(bookingId) }
        );

        if (payment?.bookingId) {
          targetBookingId = payment.bookingId.toString();
        }
      }

      if (targetBookingId) {
        const existingBooking = await Booking.findById(targetBookingId);
        const invoiceNum = existingBooking?.invoiceNumber || generateInvoiceNumber(targetBookingId, existingBooking?.bookingDate || new Date());

        await Booking.findByIdAndUpdate(targetBookingId, {
          paymentStatus: PaymentStatus.SUCCESS,
          status: BookingStatus.APPROVED,
          invoiceNumber: invoiceNum,
          invoiceDate: existingBooking?.invoiceDate || new Date(),
        });
        logger.info(`Webhook: booking ${targetBookingId} marked as PAID via ${eventType}, Invoice: ${invoiceNum}`);
      } else {
        logger.warn(`Webhook: no booking found for order ${razorpay_order_id}`);
      }
    }

    // Handle payment failed
    if (eventType === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const bookingId = paymentEntity?.notes?.bookingId;

      if (orderId || bookingId) {
        await Payment.findOneAndUpdate(
          orderId ? { transactionId: orderId } : { bookingId },
          {
            status: PaymentStatus.FAILED,
            metadata: {
              razorpay_order_id: orderId,
              razorpay_payment_id: paymentEntity?.id,
              failureReason: paymentEntity?.error_description,
              webhookEvent: eventType,
              webhookAt: new Date().toISOString(),
            },
          }
        );
        if (bookingId) {
          await Booking.findByIdAndUpdate(bookingId, {
            paymentStatus: PaymentStatus.FAILED,
          });
        }
        logger.info(`Webhook: payment failed for order ${orderId}`);
      }
    }

    // Always respond 200 to acknowledge receipt (Razorpay retries if non-200)
    res.status(200).json({ success: true, received: true });
  } catch (error: any) {
    logger.error(`webhookHandler error: ${error.message}`);
    // Still return 200 to prevent Razorpay from spamming retries on parse errors
    res.status(200).json({ success: true, received: true });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/payment/status/:bookingId
// Protected: requires auth
// Lets the frontend poll payment status — useful as a fallback after
// the user returns from a redirect-based payment (e.g., net banking).
// ─────────────────────────────────────────────────────────────────────────────
export const getPaymentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const userId = (req as any).user?.id;

    const booking = await Booking.findById(bookingId).select('userId paymentStatus status totalAmount');
    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    if (booking.userId.toString() !== userId) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const payment = await Payment.findOne({ bookingId }).select('status transactionId amount createdAt');

    res.status(200).json({
      success: true,
      data: {
        bookingId,
        paymentStatus: booking.paymentStatus,
        bookingStatus: booking.status,
        payment: payment || null,
      },
    });
  } catch (error: any) {
    logger.error(`getPaymentStatus error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to get payment status', error: error.message });
  }
};
