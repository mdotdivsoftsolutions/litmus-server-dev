"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPayment = exports.createOrder = void 0;
const crypto_1 = __importDefault(require("crypto"));
const razorpay_1 = require("../config/razorpay");
const Booking_1 = __importDefault(require("../models/Booking"));
const Payment_1 = __importDefault(require("../models/Payment"));
const types_1 = require("../types");
const createOrder = async (req, res) => {
    try {
        const { bookingId } = req.body;
        if (!bookingId) {
            res.status(400).json({
                success: false,
                message: 'Please provide a bookingId',
            });
            return;
        }
        const booking = await Booking_1.default.findById(bookingId).populate('selectedTests');
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
            booking.selectedTests.forEach((test) => {
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
        const order = await razorpay_1.razorpay.orders.create(options);
        // Create payment record in DB
        const payment = await Payment_1.default.create({
            bookingId,
            amount: totalAmount,
            transactionId: order.id,
            status: types_1.PaymentStatus.PENDING,
            method: 'RAZORPAY',
        });
        res.status(201).json({
            success: true,
            data: {
                order,
                payment,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create payment order',
            error: error.message,
        });
    }
};
exports.createOrder = createOrder;
const verifyPayment = async (req, res) => {
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
        const shasum = crypto_1.default.createHmac('sha256', secret);
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
        const payment = await Payment_1.default.findOneAndUpdate({ transactionId: razorpay_order_id }, {
            status: types_1.PaymentStatus.SUCCESS,
            metadata: { razorpay_payment_id, razorpay_signature }
        }, { new: true });
        if (payment) {
            await Booking_1.default.findByIdAndUpdate(payment.bookingId, {
                paymentStatus: types_1.PaymentStatus.SUCCESS,
            });
        }
        res.status(200).json({
            success: true,
            message: 'Payment verified successfully',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to verify payment',
            error: error.message,
        });
    }
};
exports.verifyPayment = verifyPayment;
