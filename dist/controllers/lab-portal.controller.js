"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMyLabProfile = exports.getMyLabBookings = exports.getLabDashboardStats = void 0;
const Laboratory_1 = __importDefault(require("../models/Laboratory"));
const Booking_1 = __importDefault(require("../models/Booking"));
const types_1 = require("../types");
const getLabDashboardStats = async (req, res) => {
    try {
        const userId = req.user?.id;
        const lab = await Laboratory_1.default.findOne({ userId });
        if (!lab) {
            res.status(404).json({ success: false, message: 'Laboratory not found for this user' });
            return;
        }
        const bookings = await Booking_1.default.find({ labId: lab._id });
        const pendingTests = bookings.filter(b => b.status === types_1.BookingStatus.IN_PROGRESS || b.status === types_1.BookingStatus.PENDING).length;
        const completedTests = bookings.filter(b => b.status === types_1.BookingStatus.COMPLETED).length;
        let totalEarnings = 0;
        // Earnings can be approximated by summing up the price of completed tests, assuming we have that data
        // In this basic version, we will just count it from bookings that have paymentStatus SUCCESS if applicable, or we can just return a placeholder.
        res.status(200).json({
            success: true,
            data: {
                totalBookings: bookings.length,
                pendingTests,
                completedTests,
                totalEarnings,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch lab stats', error: error.message });
    }
};
exports.getLabDashboardStats = getLabDashboardStats;
const getMyLabBookings = async (req, res) => {
    try {
        const userId = req.user?.id;
        const lab = await Laboratory_1.default.findOne({ userId });
        if (!lab) {
            res.status(404).json({ success: false, message: 'Laboratory not found for this user' });
            return;
        }
        const bookings = await Booking_1.default.find({ labId: lab._id })
            .populate('userId', 'firstName lastName email phone')
            .populate('productId', 'name')
            .populate('selectedTests', 'testName price')
            .sort('-createdAt');
        res.status(200).json({
            success: true,
            count: bookings.length,
            data: bookings,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch lab bookings', error: error.message });
    }
};
exports.getMyLabBookings = getMyLabBookings;
const updateMyLabProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        const lab = await Laboratory_1.default.findOne({ userId });
        if (!lab) {
            res.status(404).json({ success: false, message: 'Laboratory not found for this user' });
            return;
        }
        const updatedLab = await Laboratory_1.default.findByIdAndUpdate(lab._id, req.body, { new: true, runValidators: true });
        res.status(200).json({
            success: true,
            message: 'Laboratory profile updated successfully',
            data: updatedLab,
        });
    }
    catch (error) {
        res.status(400).json({ success: false, message: 'Failed to update lab profile', error: error.message });
    }
};
exports.updateMyLabProfile = updateMyLabProfile;
