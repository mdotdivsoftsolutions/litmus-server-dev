"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminAnalytics = exports.getAdminPayments = exports.getAdminStats = exports.rejectBookingResult = exports.approveBookingResult = exports.rejectBooking = exports.assignLabToBooking = exports.getAdminBookings = exports.updateUserStatus = exports.getUserById = exports.getUsers = void 0;
const User_1 = __importDefault(require("../models/User"));
const types_1 = require("../types");
const getUsers = async (req, res) => {
    try {
        const users = await User_1.default.find({ role: types_1.UserRole.USER });
        res.status(200).json({
            success: true,
            count: users.length,
            data: users,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users',
            error: error.message,
        });
    }
};
exports.getUsers = getUsers;
const getUserById = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.params.id);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: user,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user',
            error: error.message,
        });
    }
};
exports.getUserById = getUserById;
const updateUserStatus = async (req, res) => {
    try {
        const { userId, isActive } = req.body;
        if (!userId || isActive === undefined) {
            res.status(400).json({
                success: false,
                message: 'Please provide userId and isActive status',
            });
            return;
        }
        const user = await User_1.default.findByIdAndUpdate(userId, { isActive }, { new: true, runValidators: true });
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: `User status updated to ${isActive ? 'active' : 'inactive'}`,
            data: user,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update user status',
            error: error.message,
        });
    }
};
exports.updateUserStatus = updateUserStatus;
const getAdminBookings = async (req, res) => {
    try {
        Promise.resolve().then(() => __importStar(require('../models/Booking'))).then(async ({ default: Booking }) => {
            const bookings = await Booking.find()
                .populate('userId', 'firstName lastName email phone')
                .populate('labId', 'labName location')
                .populate('items.testId', 'name testName')
                .populate('items.packageId', 'name')
                .sort('-createdAt');
            res.status(200).json({
                success: true,
                count: bookings.length,
                data: bookings,
            });
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
exports.getAdminBookings = getAdminBookings;
// -----------------------------------------
// NEW: Booking Assignment & Rejection
// -----------------------------------------
const assignLabToBooking = async (req, res) => {
    try {
        Promise.resolve().then(() => __importStar(require('../models/Booking'))).then(async ({ default: Booking }) => {
            const { labId } = req.body;
            const { id } = req.params;
            if (!labId) {
                res.status(400).json({ success: false, message: 'Lab ID is required' });
                return;
            }
            const booking = await Booking.findByIdAndUpdate(id, {
                labId,
                status: 'IN_PROGRESS'
            }, { new: true });
            if (!booking) {
                res.status(404).json({ success: false, message: 'Booking not found' });
                return;
            }
            res.status(200).json({
                success: true,
                message: 'Lab assigned successfully',
                data: booking,
            });
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to assign lab',
            error: error.message,
        });
    }
};
exports.assignLabToBooking = assignLabToBooking;
const rejectBooking = async (req, res) => {
    try {
        Promise.resolve().then(() => __importStar(require('../models/Booking'))).then(async ({ default: Booking }) => {
            const { reason } = req.body;
            const { id } = req.params;
            if (!reason) {
                res.status(400).json({ success: false, message: 'Rejection reason is required' });
                return;
            }
            const booking = await Booking.findByIdAndUpdate(id, {
                status: 'REJECTED',
                $set: { 'metadata.rejectionReason': reason }
            }, { new: true });
            if (!booking) {
                res.status(404).json({ success: false, message: 'Booking not found' });
                return;
            }
            res.status(200).json({
                success: true,
                message: 'Booking rejected successfully',
                data: booking,
            });
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to reject booking',
            error: error.message,
        });
    }
};
exports.rejectBooking = rejectBooking;
const approveBookingResult = async (req, res) => {
    try {
        Promise.resolve().then(() => __importStar(require('../models/Booking'))).then(async ({ default: Booking }) => {
            Promise.resolve().then(() => __importStar(require('../types'))).then(async ({ BookingStatus }) => {
                const booking = await Booking.findById(req.params.id);
                if (!booking) {
                    res.status(404).json({
                        success: false,
                        message: 'Booking not found',
                    });
                    return;
                }
                booking.isReportApprovedByAdmin = true;
                booking.status = BookingStatus.COMPLETED;
                await booking.save();
                res.status(200).json({
                    success: true,
                    message: 'Booking result approved by admin',
                    data: booking,
                });
            });
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to approve booking result',
            error: error.message,
        });
    }
};
exports.approveBookingResult = approveBookingResult;
const rejectBookingResult = async (req, res) => {
    try {
        const { reason } = req.body;
        Promise.resolve().then(() => __importStar(require('../models/Booking'))).then(async ({ default: Booking }) => {
            Promise.resolve().then(() => __importStar(require('../types'))).then(async ({ BookingStatus }) => {
                const booking = await Booking.findById(req.params.id);
                if (!booking) {
                    res.status(404).json({
                        success: false,
                        message: 'Booking not found',
                    });
                    return;
                }
                booking.isReportApprovedByAdmin = false;
                booking.status = BookingStatus.IN_PROGRESS; // Revert status
                booking.reportFiles = []; // Remove rejected reports
                // Optionally save the rejection reason in metadata or notes
                if (!booking.metadata)
                    booking.metadata = {};
                booking.metadata.rejectionReason = reason;
                await booking.save();
                res.status(200).json({
                    success: true,
                    message: 'Booking result rejected and sent back to lab',
                    data: booking,
                });
            });
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to reject booking result',
            error: error.message,
        });
    }
};
exports.rejectBookingResult = rejectBookingResult;
const getAdminStats = async (req, res) => {
    try {
        const totalUsers = await User_1.default.countDocuments();
        let totalLabs = 0;
        let totalBookings = 0;
        let totalRevenue = 0;
        await Promise.resolve().then(() => __importStar(require('../models/Laboratory'))).then(async ({ default: Laboratory }) => {
            totalLabs = await Laboratory.countDocuments();
        });
        await Promise.resolve().then(() => __importStar(require('../models/Booking'))).then(async ({ default: Booking }) => {
            totalBookings = await Booking.countDocuments();
        });
        await Promise.resolve().then(() => __importStar(require('../models/Payment'))).then(async ({ default: Payment }) => {
            Promise.resolve().then(() => __importStar(require('../types'))).then(async ({ PaymentStatus }) => {
                const payments = await Payment.find({ status: PaymentStatus.SUCCESS });
                totalRevenue = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
                res.status(200).json({
                    success: true,
                    data: {
                        totalUsers,
                        totalLabs,
                        totalBookings,
                        totalRevenue,
                    }
                });
            });
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch admin stats',
            error: error.message,
        });
    }
};
exports.getAdminStats = getAdminStats;
const getAdminPayments = async (req, res) => {
    try {
        Promise.resolve().then(() => __importStar(require('../models/Payment'))).then(async ({ default: Payment }) => {
            const payments = await Payment.find()
                .populate({
                path: 'bookingId',
                populate: [
                    { path: 'userId', select: 'firstName lastName email' },
                    { path: 'labId', select: 'labName' }
                ]
            })
                .sort('-createdAt');
            res.status(200).json({
                success: true,
                count: payments.length,
                data: payments,
            });
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch admin payments',
            error: error.message,
        });
    }
};
exports.getAdminPayments = getAdminPayments;
const getAdminAnalytics = async (req, res) => {
    try {
        const { default: Booking } = await Promise.resolve().then(() => __importStar(require('../models/Booking')));
        const { default: Laboratory } = await Promise.resolve().then(() => __importStar(require('../models/Laboratory')));
        const { default: User } = await Promise.resolve().then(() => __importStar(require('../models/User')));
        // 1. Booking Volume (Last 14 days)
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        const bookingVolumeAgg = await Booking.aggregate([
            { $match: { createdAt: { $gte: fourteenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    bookings: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        const bookingVolume = bookingVolumeAgg.map(item => ({
            day: item._id,
            bookings: item.bookings
        }));
        // 2. Revenue by Lab
        const revenueByLabAgg = await Booking.aggregate([
            { $match: { status: { $ne: 'PENDING' } } },
            { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: "$labId",
                    revenue: { $sum: "$items.price" },
                    bookings: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'laboratories',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'lab'
                }
            },
            { $unwind: { path: "$lab", preserveNullAndEmptyArrays: true } },
            { $sort: { revenue: -1 } },
            { $limit: 10 }
        ]);
        const revenueByLab = revenueByLabAgg.map(item => ({
            name: item.lab?.labName || item.lab?.city || "Unknown Lab",
            revenue: item.revenue || 0,
            bookings: item.bookings
        }));
        // 3. User Growth (monthly)
        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(currentYear, 0, 1);
        const userGrowthAgg = await User.aggregate([
            { $match: { createdAt: { $gte: startOfYear }, role: 'USER' } },
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    users: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        const userGrowth = userGrowthAgg.map(item => ({
            month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][item._id - 1],
            users: item.users
        }));
        // 4. Top Products
        const topProductsAgg = await Booking.aggregate([
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.packageId", // Group by packageId or testId, let's use packageId or just the string itemType
                    bookings: { $sum: 1 },
                    revenue: { $sum: "$items.price" }
                }
            },
            {
                $lookup: {
                    from: 'packages',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'package'
                }
            },
            { $unwind: { path: "$package", preserveNullAndEmptyArrays: true } },
            { $sort: { bookings: -1 } },
            { $limit: 10 }
        ]);
        const topProducts = topProductsAgg.map(item => ({
            name: item.package?.name || "Service / Test",
            bookings: item.bookings,
            revenue: `₹${(item.revenue / 100000).toFixed(1)}L`
        }));
        const testTypeDistribution = [
            { name: "Chemical", value: 45, color: "#E03A18" },
            { name: "Microbiological", value: 30, color: "#F26419" },
            { name: "Physical", value: 25, color: "#F59E2B" },
        ];
        res.status(200).json({
            success: true,
            data: {
                bookingVolume,
                revenueByLab,
                userGrowth,
                topProducts,
                testTypeDistribution
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch analytics',
            error: error.message,
        });
    }
};
exports.getAdminAnalytics = getAdminAnalytics;
