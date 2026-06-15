"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBookingById = exports.getMyBookings = exports.createBooking = void 0;
const Booking_1 = __importDefault(require("../models/Booking"));
const types_1 = require("../types");
const createBooking = async (req, res) => {
    try {
        let { labId, items, bookingDate, totalAmount, metadata } = req.body;
        const userId = req.user?.id;
        if (!items || !items.length || !bookingDate) {
            res.status(400).json({
                success: false,
                message: 'Please provide items, and bookingDate',
            });
            return;
        }
        if (labId === 'admin') {
            labId = undefined; // Litmus Smart Allocation
        }
        const booking = await Booking_1.default.create({
            userId,
            labId,
            items,
            bookingDate,
            totalAmount,
            metadata,
            status: types_1.BookingStatus.PENDING,
        });
        res.status(201).json({
            success: true,
            data: booking,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Failed to create booking',
            error: error.message,
        });
    }
};
exports.createBooking = createBooking;
const getMyBookings = async (req, res) => {
    try {
        const userId = req.user?.id;
        const bookings = await Booking_1.default.find({ userId })
            .populate('labId', 'labName location')
            .populate('items.testId', 'testName price metadata')
            .populate('items.packageId', 'name tests')
            .sort('-createdAt');
        const sanitizedBookings = bookings.map(b => {
            const obj = b.toObject();
            if (!obj.isReportApprovedByAdmin) {
                delete obj.reportFiles;
            }
            return obj;
        });
        res.status(200).json({
            success: true,
            count: sanitizedBookings.length,
            data: sanitizedBookings,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bookings',
            error: error.message,
        });
    }
};
exports.getMyBookings = getMyBookings;
const getBookingById = async (req, res) => {
    try {
        const booking = await Booking_1.default.findById(req.params.id)
            .populate('labId')
            .populate('items.testId')
            .populate('items.packageId')
            .populate('userId', 'firstName lastName email phone');
        if (!booking) {
            res.status(404).json({
                success: false,
                message: 'Booking not found',
            });
            return;
        }
        // Check if the booking belongs to the current user, or if they are admin/lab
        if (booking.userId._id.toString() !== req.user?.id && req.user?.role === types_1.UserRole.USER) {
            res.status(403).json({
                success: false,
                message: 'Not authorized to view this booking',
            });
            return;
        }
        const obj = booking.toObject();
        if (!obj.isReportApprovedByAdmin && req.user?.role === types_1.UserRole.USER) {
            delete obj.reportFiles;
        }
        res.status(200).json({
            success: true,
            data: obj,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch booking',
            error: error.message,
        });
    }
};
exports.getBookingById = getBookingById;
