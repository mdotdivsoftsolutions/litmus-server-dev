import { Request, Response } from 'express';
import crypto from 'crypto';
import { razorpay } from '../config/razorpay';
import Booking from '../models/Booking';
import Payment from '../models/Payment';
import { PaymentStatus } from '../types';

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      res.status(400).json({
        success: false,
        message: 'Please provide a bookingId',
      });
      return;
    }

    const booking = await Booking.findById(bookingId).populate('selectedTests');
    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
      return;
    }

    // Calculate total amount from selected tests
    let totalAmount = 0;
    if (booking.selectedTests && booking.selectedTests.length > 0) {
      booking.selectedTests.forEach((test: any) => {
        totalAmount += test.price || 0;
      });
    }

    if (totalAmount === 0) {
      res.status(400).json({
        success: false,
        message: 'Booking amount is zero, cannot create payment order',
      });
      return;
    }

    // Create Razorpay order
    const options = {
      amount: totalAmount * 100, // Amount in paise
      currency: 'INR',
      receipt: `receipt_order_${bookingId}`,
    };

    const order = await razorpay.orders.create(options);

    // Create payment record in DB
    const payment = await Payment.create({
      bookingId,
      amount: totalAmount,
      transactionId: order.id,
      status: PaymentStatus.PENDING,
      method: 'RAZORPAY',
    });

    res.status(201).json({
      success: true,
      data: {
        order,
        payment,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: error.message,
    });
  }
};

export const verifyPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({
        success: false,
        message: 'Missing payment verification details',
      });
      return;
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || '';

    // Verify signature
    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest !== razorpay_signature) {
      res.status(400).json({
        success: false,
        message: 'Transaction not legit!',
      });
      return;
    }

    // Payment is valid, update DB
    const payment = await Payment.findOneAndUpdate(
      { transactionId: razorpay_order_id },
      { 
        status: PaymentStatus.SUCCESS,
        metadata: { razorpay_payment_id, razorpay_signature } 
      },
      { new: true }
    );

    if (payment) {
      await Booking.findByIdAndUpdate(payment.bookingId, {
        paymentStatus: PaymentStatus.SUCCESS,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: error.message,
    });
  }
};
