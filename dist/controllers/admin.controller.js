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
exports.rejectPackage = exports.approvePackage = exports.rejectTest = exports.approveTest = exports.getPendingApprovals = exports.updateCollectionDetails = exports.getAdminAnalytics = exports.getAdminPayments = exports.getAdminStats = exports.rejectBookingResult = exports.updateBookingReport = exports.approveBookingResult = exports.rejectBooking = exports.assignLabToBooking = exports.updateAdminBookingStatus = exports.getAdminBookings = exports.addUserAdminNote = exports.updateAdminUserProfile = exports.getUserDetailedProfile = exports.createUser = exports.updateUserStatus = exports.getUserById = exports.getUsers = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
const types_1 = require("../types");
const getUsers = async (req, res) => {
    try {
        const { status, search, startDate, endDate } = req.query;
        const filter = { role: types_1.UserRole.USER };
        if (status === 'active') {
            filter.isActive = true;
        }
        else if (status === 'inactive') {
            filter.isActive = false;
        }
        if (search) {
            const searchRegex = new RegExp(String(search).trim(), 'i');
            filter.$or = [
                { firstName: searchRegex },
                { lastName: searchRegex },
                { email: searchRegex },
                { phone: searchRegex },
            ];
        }
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                const start = new Date(String(startDate));
                start.setHours(0, 0, 0, 0);
                filter.createdAt.$gte = start;
            }
            if (endDate) {
                const end = new Date(String(endDate));
                end.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = end;
            }
        }
        const users = await User_1.default.find(filter).sort({ createdAt: -1 });
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
const createUser = async (req, res) => {
    try {
        const { firstName, lastName, email, phone, password, role } = req.body;
        // Check if user exists
        const existingUser = await User_1.default.findOne({ $or: [{ email }, { phone }] });
        if (existingUser) {
            if (existingUser.email === email) {
                res.status(400).json({ success: false, message: 'Email already registered' });
                return;
            }
            if (existingUser.phone === phone) {
                res.status(400).json({ success: false, message: 'Mobile number already registered' });
                return;
            }
        }
        const newUser = await User_1.default.create({
            firstName,
            lastName,
            email,
            phone,
            password, // Pre-save hook will hash it
            role: role || types_1.UserRole.USER,
            isActive: true,
        });
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                id: newUser._id,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                email: newUser.email,
                phone: newUser.phone,
                role: newUser.role
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create user',
            error: error.message,
        });
    }
};
exports.createUser = createUser;
const getUserDetailedProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User_1.default.findById(userId);
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        const { default: Booking } = await Promise.resolve().then(() => __importStar(require('../models/Booking')));
        const { default: Payment } = await Promise.resolve().then(() => __importStar(require('../models/Payment')));
        const { default: Cart } = await Promise.resolve().then(() => __importStar(require('../models/Cart')));
        const { Consultation } = await Promise.resolve().then(() => __importStar(require('../models/Consultation')));
        const { default: ChatSession } = await Promise.resolve().then(() => __importStar(require('../models/ChatSession')));
        // Robust multi-key booking lookup
        const filterConditions = [
            { userId: user._id }
        ];
        if (typeof userId === 'string' && mongoose_1.default.Types.ObjectId.isValid(userId)) {
            filterConditions.push({ userId: new mongoose_1.default.Types.ObjectId(userId) });
        }
        if (user.email) {
            filterConditions.push({ 'collectionDetails.email': user.email });
            filterConditions.push({ 'userEmail': user.email });
        }
        if (user.phone) {
            filterConditions.push({ 'collectionDetails.phone': user.phone });
        }
        // Get bookings
        const bookings = await Booking.find({ $or: filterConditions })
            .populate('labId', 'labName location contactPhone contactEmail')
            .populate('items.testId', 'name testName metadata price tat sampleRequirement')
            .populate('items.packageId', 'name price tat sampleRequirement')
            .sort('-createdAt');
        // Get payments linked to bookings
        const bookingIds = bookings.map(b => b._id);
        const dbPayments = await Payment.find({ bookingId: { $in: bookingIds } })
            .populate({
            path: 'bookingId',
            select: 'totalAmount status createdAt labId bookingId',
            populate: { path: 'labId', select: 'labName' }
        })
            .sort('-createdAt');
        // If separate Payment records don't exist yet for some bookings, synthesize them so admin can see full history
        const synthesizedPayments = bookings
            .filter(b => !dbPayments.some(p => String(p.bookingId?._id || p.bookingId) === String(b._id)))
            .map(b => ({
            _id: `PAY-${b._id}`,
            bookingId: b,
            amount: b.totalAmount || 0,
            status: ['SUCCESS', 'PAID', 'Approved', 'Completed'].includes(String(b.paymentStatus || b.status)) ? 'SUCCESS' : b.paymentStatus === 'FAILED' ? 'FAILED' : 'PENDING',
            method: b.metadata?.paymentMethod || 'Online Gateway',
            transactionId: b.metadata?.transactionId || b.metadata?.razorpay_payment_id || `TXN-${String(b._id).slice(-6).toUpperCase()}`,
            razorpayOrderId: b.metadata?.razorpay_order_id || `ORD-${String(b._id).slice(-6).toUpperCase()}`,
            createdAt: b.createdAt
        }));
        const allPayments = [...dbPayments, ...synthesizedPayments].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        // Get abandoned cart
        const cart = await Cart.findOne({ $or: [{ userId: user._id }, { userId }] })
            .populate('items.testId', 'name testName price')
            .populate('items.packageId', 'name price');
        // Get any consultations requested by this user
        const consultationFilters = [];
        if (user.email)
            consultationFilters.push({ email: user.email.toLowerCase() });
        if (user.phone)
            consultationFilters.push({ phone: user.phone });
        let consultations = [];
        if (consultationFilters.length > 0) {
            consultations = await Consultation.find({ $or: consultationFilters }).sort('-createdAt');
        }
        // Get Chat / Support Sessions
        const chatFilters = [{ userId: user._id }];
        if (user.email)
            chatFilters.push({ 'guestInfo.email': user.email.toLowerCase() });
        if (user.phone)
            chatFilters.push({ 'guestInfo.phone': user.phone });
        const chatSessions = await ChatSession.find({ $or: chatFilters })
            .populate('assignedAgent', 'firstName lastName')
            .sort('-createdAt')
            .limit(10);
        // Calculate comprehensive stats
        const totalBookings = bookings.length;
        const completedBookings = bookings.filter(b => String(b.status).toUpperCase() === 'COMPLETED').length;
        const pendingBookings = bookings.filter(b => !['COMPLETED', 'REJECTED', 'CANCELLED'].includes(String(b.status).toUpperCase())).length;
        const unpaidBookings = bookings.filter(b => !['SUCCESS', 'PAID'].includes(String(b.paymentStatus || '').toUpperCase()) && !['CANCELLED', 'REJECTED'].includes(String(b.status).toUpperCase())).length;
        const cancelledBookings = bookings.filter(b => ['CANCELLED', 'REJECTED'].includes(String(b.status).toUpperCase())).length;
        const totalAmountPaid = bookings
            .filter(b => ['SUCCESS', 'PAID'].includes(String(b.paymentStatus || '').toUpperCase()) || String(b.status).toUpperCase() === 'COMPLETED')
            .reduce((sum, b) => sum + (b.totalAmount || 0), 0)
            || allPayments.filter(p => p.status === 'SUCCESS').reduce((sum, p) => sum + (p.amount || 0), 0);
        const totalUnpaidAmount = bookings
            .filter(b => !['SUCCESS', 'PAID'].includes(String(b.paymentStatus || '').toUpperCase()) && !['CANCELLED', 'REJECTED'].includes(String(b.status).toUpperCase()))
            .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
        const averageOrderValue = totalBookings > 0 ? Math.round(totalAmountPaid / (completedBookings || totalBookings || 1)) : 0;
        const firstBookingDate = bookings.length > 0 ? bookings[bookings.length - 1].createdAt : null;
        const lastBookingDate = bookings.length > 0 ? bookings[0].createdAt : null;
        // Synthesize chronological activity timeline
        const activities = [];
        // 1. Account Created
        if (user.createdAt) {
            activities.push({
                id: `ACT-REG-${user._id}`,
                type: 'REGISTRATION',
                title: 'Account Registered',
                description: `Client account created on Litmus platform via ${user.phone ? 'Phone verification' : 'Email registration'}.`,
                date: user.createdAt,
                status: user.isActive ? 'Active' : 'Suspended',
            });
        }
        // 2. Last Login
        if (user.lastLoginAt) {
            activities.push({
                id: `ACT-LOG-${user._id}`,
                type: 'LOGIN',
                title: 'Last Portal Session',
                description: 'Client logged into the Litmus portal.',
                date: user.lastLoginAt,
            });
        }
        // 3. Bookings
        bookings.forEach((b) => {
            const bkgCode = `BKG-${String(b._id).slice(-6).toUpperCase()}`;
            activities.push({
                id: `ACT-BKG-${b._id}`,
                type: 'BOOKING',
                title: `Placed Order ${bkgCode}`,
                description: `Diagnostic booking created for ₹${b.totalAmount?.toLocaleString() || 0} (${b.status || 'Pending'}).`,
                date: b.createdAt,
                status: b.status,
                metadata: { bookingId: b._id, amount: b.totalAmount },
            });
        });
        // 4. Payments
        allPayments.forEach((p) => {
            if (p.status === 'SUCCESS') {
                activities.push({
                    id: `ACT-PAY-${p._id}`,
                    type: 'PAYMENT',
                    title: `Payment Received (₹${p.amount?.toLocaleString() || 0})`,
                    description: `Processed via ${p.method || 'Online Gateway'} (${p.transactionId || 'Success'}).`,
                    date: p.createdAt,
                    status: 'SUCCESS',
                });
            }
        });
        // 5. Consultations
        consultations.forEach((c) => {
            activities.push({
                id: `ACT-CNS-${c._id}`,
                type: 'CONSULTATION',
                title: `Requested Consultation: ${c.topic || c.serviceName || 'Diagnostic Inquiries'}`,
                description: `Status: ${c.status || 'Pending'}. Scheduled with Litmus technical team.`,
                date: c.createdAt,
                status: c.status,
            });
        });
        // 6. Support Sessions
        chatSessions.forEach((s) => {
            activities.push({
                id: `ACT-CHT-${s._id}`,
                type: 'SUPPORT_CHAT',
                title: `Support Inquiry (${s.sessionId})`,
                description: `Live chat session with ${s.assignedAgent?.firstName || 'Litmus Support'}. Status: ${s.status}.`,
                date: s.createdAt,
                status: s.status,
            });
        });
        activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        res.status(200).json({
            success: true,
            data: {
                user,
                stats: {
                    totalBookings,
                    completedBookings,
                    pendingBookings,
                    unpaidBookings,
                    cancelledBookings,
                    totalAmountPaid,
                    totalUnpaidAmount,
                    averageOrderValue,
                    firstBookingDate,
                    lastBookingDate,
                    totalConsultations: consultations.length,
                    totalSupportChats: chatSessions.length,
                },
                bookings,
                payments: allPayments,
                cart: cart || { items: [] },
                consultations,
                chatSessions,
                activities,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch detailed user profile',
            error: error.message,
        });
    }
};
exports.getUserDetailedProfile = getUserDetailedProfile;
/**
 * Update user profile from Admin (Business details, KYC, addresses)
 */
const updateAdminUserProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        const updates = req.body;
        // Disallow password mutation via this route
        delete updates.password;
        const user = await User_1.default.findByIdAndUpdate(userId, { $set: updates }, { new: true, runValidators: true });
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'User profile updated successfully',
            data: user,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update user profile',
            error: error.message,
        });
    }
};
exports.updateAdminUserProfile = updateAdminUserProfile;
/**
 * Add internal staff note to user profile
 */
const addUserAdminNote = async (req, res) => {
    try {
        const userId = req.params.id;
        const { note } = req.body;
        if (!note || !note.trim()) {
            res.status(400).json({ success: false, message: 'Note text is required' });
            return;
        }
        const authUser = req.user;
        const authorName = authUser ? `${authUser.firstName || ''} ${authUser.lastName || ''}`.trim() || 'Admin Specialist' : 'Staff Member';
        const user = await User_1.default.findByIdAndUpdate(userId, {
            $push: {
                adminNotes: {
                    note: note.trim(),
                    authorId: authUser?._id,
                    authorName,
                    createdAt: new Date(),
                },
            },
        }, { new: true });
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'Staff note added to user profile',
            data: user.adminNotes,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to add staff note',
            error: error.message,
        });
    }
};
exports.addUserAdminNote = addUserAdminNote;
const getAdminBookings = async (req, res) => {
    try {
        const { default: Booking } = await Promise.resolve().then(() => __importStar(require('../models/Booking')));
        // Auto-heal any bookings whose payment was verified or are already active in testing
        await Booking.updateMany({
            status: { $in: [types_1.BookingStatus.APPROVED, types_1.BookingStatus.IN_PROGRESS, types_1.BookingStatus.COMPLETED] },
            paymentStatus: { $ne: types_1.PaymentStatus.SUCCESS }
        }, { paymentStatus: types_1.PaymentStatus.SUCCESS }).catch(() => { });
        const { status, paymentStatus, search, startDate, endDate, page, limit } = req.query;
        const filter = {};
        if (status && status !== 'all') {
            const normalizedStatus = String(status).trim().toUpperCase().replace(/\s+/g, '_');
            if (normalizedStatus in types_1.BookingStatus || Object.values(types_1.BookingStatus).includes(normalizedStatus)) {
                filter.status = normalizedStatus;
            }
        }
        if (paymentStatus && paymentStatus !== 'all') {
            const normalizedPay = String(paymentStatus).trim().toUpperCase().replace(/\s+/g, '_');
            if (normalizedPay === 'PAID') {
                filter.paymentStatus = { $in: [types_1.PaymentStatus.SUCCESS, 'PAID'] };
            }
            else if (normalizedPay in types_1.PaymentStatus || Object.values(types_1.PaymentStatus).includes(normalizedPay)) {
                filter.paymentStatus = normalizedPay;
            }
        }
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(String(startDate));
            }
            if (endDate) {
                const end = new Date(String(endDate));
                end.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = end;
            }
        }
        if (search && String(search).trim()) {
            const q = String(search).trim();
            const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const { default: User } = await Promise.resolve().then(() => __importStar(require('../models/User')));
            const matchingUsers = await User.find({
                $or: [
                    { firstName: { $regex: escaped, $options: 'i' } },
                    { lastName: { $regex: escaped, $options: 'i' } },
                    { email: { $regex: escaped, $options: 'i' } },
                    { phone: { $regex: escaped, $options: 'i' } },
                ]
            }).select('_id');
            const userIds = matchingUsers.map(u => u._id);
            const orConditions = [
                { userId: { $in: userIds } },
                { invoiceNumber: { $regex: escaped, $options: 'i' } },
                { 'items.samples.productName': { $regex: escaped, $options: 'i' } }
            ];
            const cleanHex = q.replace(/^BKG-/i, '').trim();
            if (cleanHex.length === 24 && /^[0-9a-fA-F]{24}$/.test(cleanHex)) {
                const { default: mongoose } = await Promise.resolve().then(() => __importStar(require('mongoose')));
                orConditions.push({ _id: new mongoose.Types.ObjectId(cleanHex) });
            }
            filter.$or = orConditions;
        }
        const pageNum = page ? parseInt(String(page), 10) || 1 : 1;
        const limitNum = limit ? parseInt(String(limit), 10) || 0 : 0;
        const skip = limitNum > 0 ? (pageNum - 1) * limitNum : 0;
        const total = await Booking.countDocuments(filter);
        let query = Booking.find(filter)
            .populate('userId', 'firstName lastName email phone')
            .populate('labId', 'labName location')
            .populate('items.testId', 'name testName metadata')
            .populate({
            path: 'items.packageId',
            select: 'name tests features',
            populate: {
                path: 'tests',
                select: 'testName metadata'
            }
        })
            .sort('-createdAt');
        if (limitNum > 0) {
            query = query.skip(skip).limit(limitNum);
        }
        const bookings = await query;
        res.status(200).json({
            success: true,
            count: bookings.length,
            total,
            page: pageNum,
            totalPages: limitNum > 0 ? Math.max(1, Math.ceil(total / limitNum)) : 1,
            data: bookings,
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
// NEW: Booking Assignment & Rejection & Status
// -----------------------------------------
const updateAdminBookingStatus = async (req, res) => {
    try {
        const { default: Booking } = await Promise.resolve().then(() => __importStar(require('../models/Booking')));
        const { id } = req.params;
        const { status, paymentStatus, labId } = req.body;
        const booking = await Booking.findById(id);
        if (!booking) {
            res.status(404).json({ success: false, message: 'Booking not found' });
            return;
        }
        if (status && Object.values(types_1.BookingStatus).includes(status)) {
            booking.status = status;
        }
        if (paymentStatus && Object.values(types_1.PaymentStatus).includes(paymentStatus)) {
            booking.paymentStatus = paymentStatus;
        }
        if (labId !== undefined) {
            if (!booking.metadata)
                booking.metadata = {};
            if (labId === 'litmus_direct') {
                booking.labId = undefined;
                booking.metadata.isLitmusDirect = true;
            }
            else if (labId === 'smart_allocation' || labId === '') {
                booking.labId = undefined;
                booking.metadata.isLitmusDirect = false;
            }
            else {
                booking.labId = labId;
                booking.metadata.isLitmusDirect = false;
            }
            booking.markModified('metadata');
        }
        await booking.save();
        res.status(200).json({
            success: true,
            message: 'Booking updated successfully',
            data: booking,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update booking status',
            error: error.message,
        });
    }
};
exports.updateAdminBookingStatus = updateAdminBookingStatus;
const assignLabToBooking = async (req, res) => {
    try {
        const { default: Booking } = await Promise.resolve().then(() => __importStar(require('../models/Booking')));
        const { labId } = req.body;
        const { id } = req.params;
        const isLitmusDirect = !labId || labId === 'litmus_direct' || labId === 'litmus' || labId === 'litmus_internal';
        const updatedLabId = isLitmusDirect ? undefined : labId;
        const booking = await Booking.findByIdAndUpdate(id, {
            labId: updatedLabId,
            status: types_1.BookingStatus.IN_PROGRESS
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
        const { reportUrl, reportFiles, summary, recommendations, tips, additionalNotes, reportSummary } = req.body || {};
        Promise.resolve().then(() => __importStar(require('../models/Booking'))).then(async ({ default: Booking }) => {
            Promise.resolve().then(() => __importStar(require('../types'))).then(async ({ BookingStatus }) => {
                const { sendTestReportReadyEmail } = await Promise.resolve().then(() => __importStar(require('../utils/mailer')));
                const booking = await Booking.findById(req.params.id).populate('userId', 'firstName lastName email');
                if (!booking) {
                    res.status(404).json({
                        success: false,
                        message: 'Booking not found',
                    });
                    return;
                }
                if (Array.isArray(reportFiles) && reportFiles.length > 0) {
                    booking.reportFiles = reportFiles;
                }
                else if (reportUrl && (!booking.reportFiles || !booking.reportFiles.includes(reportUrl))) {
                    if (!booking.reportFiles)
                        booking.reportFiles = [];
                    booking.reportFiles.push(reportUrl);
                }
                const mergedSummary = summary !== undefined ? summary : reportSummary?.summary;
                const mergedRecs = recommendations !== undefined ? recommendations : reportSummary?.recommendations;
                const mergedTips = tips !== undefined ? tips : reportSummary?.tips;
                const mergedNotes = additionalNotes !== undefined ? additionalNotes : reportSummary?.additionalNotes;
                if (mergedSummary !== undefined || mergedRecs !== undefined || mergedTips !== undefined || mergedNotes !== undefined) {
                    booking.reportSummary = {
                        summary: mergedSummary !== undefined ? String(mergedSummary) : (booking.reportSummary?.summary || ''),
                        recommendations: mergedRecs !== undefined ? String(mergedRecs) : (booking.reportSummary?.recommendations || ''),
                        tips: mergedTips !== undefined ? String(mergedTips) : (booking.reportSummary?.tips || ''),
                        additionalNotes: mergedNotes !== undefined ? String(mergedNotes) : (booking.reportSummary?.additionalNotes || ''),
                        updatedAt: new Date(),
                        updatedByRole: 'ADMIN',
                    };
                }
                booking.isReportApprovedByAdmin = true;
                booking.status = BookingStatus.COMPLETED;
                await booking.save();
                if (booking.userId) {
                    try {
                        const user = booking.userId;
                        const customerName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Valued Customer';
                        const { default: NotificationService } = await Promise.resolve().then(() => __importStar(require('../services/notification.service')));
                        await NotificationService.notifyDeliveryUpdate({
                            customerEmail: user.email,
                            customerPhone: user.phone,
                            customerName,
                            bookingId: booking._id.toString(),
                        });
                    }
                    catch (e) {
                        console.error('Failed to send report ready notification:', e);
                    }
                }
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
const updateBookingReport = async (req, res) => {
    try {
        const { reportUrl, reportFiles, summary, recommendations, tips, additionalNotes, reportSummary, isReportApprovedByAdmin } = req.body;
        Promise.resolve().then(() => __importStar(require('../models/Booking'))).then(async ({ default: Booking }) => {
            Promise.resolve().then(() => __importStar(require('../types'))).then(async ({ BookingStatus }) => {
                const { sendTestReportReadyEmail } = await Promise.resolve().then(() => __importStar(require('../utils/mailer')));
                const booking = await Booking.findById(req.params.id).populate('userId', 'firstName lastName email');
                if (!booking) {
                    res.status(404).json({
                        success: false,
                        message: 'Booking not found',
                    });
                    return;
                }
                if (Array.isArray(reportFiles)) {
                    booking.reportFiles = reportFiles;
                }
                else if (reportUrl) {
                    if (!booking.reportFiles)
                        booking.reportFiles = [];
                    if (!booking.reportFiles.includes(reportUrl)) {
                        booking.reportFiles.push(reportUrl);
                    }
                }
                const mergedSummary = summary !== undefined ? summary : reportSummary?.summary;
                const mergedRecs = recommendations !== undefined ? recommendations : reportSummary?.recommendations;
                const mergedTips = tips !== undefined ? tips : reportSummary?.tips;
                const mergedNotes = additionalNotes !== undefined ? additionalNotes : reportSummary?.additionalNotes;
                booking.reportSummary = {
                    summary: mergedSummary !== undefined ? String(mergedSummary) : (booking.reportSummary?.summary || ''),
                    recommendations: mergedRecs !== undefined ? String(mergedRecs) : (booking.reportSummary?.recommendations || ''),
                    tips: mergedTips !== undefined ? String(mergedTips) : (booking.reportSummary?.tips || ''),
                    additionalNotes: mergedNotes !== undefined ? String(mergedNotes) : (booking.reportSummary?.additionalNotes || ''),
                    updatedAt: new Date(),
                    updatedByRole: 'ADMIN',
                };
                const wasApproved = booking.isReportApprovedByAdmin;
                if (isReportApprovedByAdmin !== undefined) {
                    booking.isReportApprovedByAdmin = Boolean(isReportApprovedByAdmin);
                    if (booking.isReportApprovedByAdmin) {
                        booking.status = BookingStatus.COMPLETED;
                    }
                }
                await booking.save();
                if (!wasApproved && booking.isReportApprovedByAdmin && booking.userId) {
                    try {
                        const user = booking.userId;
                        if (user.email) {
                            const customerName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
                            await sendTestReportReadyEmail(user.email, {
                                customerName,
                                bookingId: booking._id.toString(),
                            });
                        }
                    }
                    catch (e) {
                        console.error('Failed to send report ready email:', e);
                    }
                }
                res.status(200).json({
                    success: true,
                    message: 'Report and summary updated successfully',
                    data: booking,
                });
            });
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update report',
            error: error.message,
        });
    }
};
exports.updateBookingReport = updateBookingReport;
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
        const { default: User } = await Promise.resolve().then(() => __importStar(require('../models/User')));
        const { default: Laboratory } = await Promise.resolve().then(() => __importStar(require('../models/Laboratory')));
        const { default: Booking } = await Promise.resolve().then(() => __importStar(require('../models/Booking')));
        const { default: Payment } = await Promise.resolve().then(() => __importStar(require('../models/Payment')));
        const { Consultation } = await Promise.resolve().then(() => __importStar(require('../models/Consultation')));
        const { default: Test } = await Promise.resolve().then(() => __importStar(require('../models/Test')));
        const { default: Package } = await Promise.resolve().then(() => __importStar(require('../models/Package')));
        const { default: Category } = await Promise.resolve().then(() => __importStar(require('../models/Category')));
        const { default: Review } = await Promise.resolve().then(() => __importStar(require('../models/Review')));
        const { UserRole, BookingStatus, PaymentStatus, ApprovalStatus } = await Promise.resolve().then(() => __importStar(require('../types')));
        const [totalUsers, activeUsers, totalEmployees, activeEmployees, totalLabs, activeLabs, totalBookings, pendingBookings, inProgressBookings, totalConsultations, pendingConsultations, pendingTests, pendingPackages, pendingReports, totalReports, totalCategories, totalTests, totalPackages, totalReviews, successfulPayments,] = await Promise.all([
            User.countDocuments({ role: UserRole.USER }),
            User.countDocuments({ role: UserRole.USER, isActive: true }),
            User.countDocuments({ role: UserRole.EMPLOYEE }),
            User.countDocuments({ role: UserRole.EMPLOYEE, isActive: true }),
            Laboratory.countDocuments(),
            Laboratory.countDocuments({ isActive: true }),
            Booking.countDocuments(),
            Booking.countDocuments({ status: BookingStatus.PENDING }),
            Booking.countDocuments({ status: { $in: [BookingStatus.APPROVED, BookingStatus.IN_PROGRESS] } }),
            Consultation.countDocuments().catch(() => 0),
            Consultation.countDocuments({ status: 'Pending' }).catch(() => 0),
            Test.countDocuments({ approvalStatus: ApprovalStatus.PENDING }).catch(() => 0),
            Package.countDocuments({ approvalStatus: ApprovalStatus.PENDING }).catch(() => 0),
            Booking.countDocuments({
                reportFiles: { $exists: true, $ne: [] },
                isReportApprovedByAdmin: false
            }).catch(() => 0),
            Booking.countDocuments({
                reportFiles: { $exists: true, $ne: [] },
            }).catch(() => 0),
            Category.countDocuments().catch(() => 0),
            Test.countDocuments().catch(() => 0),
            Package.countDocuments().catch(() => 0),
            Review.countDocuments().catch(() => 0),
            Payment.find({ status: PaymentStatus.SUCCESS }).select('amount').catch(() => []),
        ]);
        const totalRevenue = successfulPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const pendingApprovals = (Number(pendingTests) || 0) + (Number(pendingPackages) || 0);
        res.status(200).json({
            success: true,
            data: {
                totalUsers,
                activeUsers,
                totalEmployees,
                activeEmployees,
                totalLabs,
                activeLabs,
                totalBookings,
                pendingBookings,
                inProgressBookings,
                totalConsultations,
                pendingConsultations,
                pendingApprovals,
                pendingReports,
                totalReports,
                totalCategories,
                totalTests,
                totalPackages,
                totalReviews,
                totalRevenue,
            }
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
const updateCollectionDetails = async (req, res) => {
    try {
        const { status, collectorName, collectorContact, notifyDelay, courierDetails, trackingId, courierName, notes, collectionMethod } = req.body;
        const { id } = req.params;
        const { default: Booking } = await Promise.resolve().then(() => __importStar(require('../models/Booking')));
        const { sendSampleCollectedEmail, sendCollectionDelayedEmail } = await Promise.resolve().then(() => __importStar(require('../utils/mailer')));
        const booking = await Booking.findById(id);
        if (!booking) {
            res.status(404).json({ success: false, message: 'Booking not found' });
            return;
        }
        if (status)
            booking.collectionStatus = status;
        if (collectionMethod)
            booking.collectionMethod = collectionMethod;
        if (collectorName !== undefined || collectorContact !== undefined) {
            booking.assignedCollector = {
                name: collectorName || '',
                contact: collectorContact || ''
            };
        }
        const newTrackingId = courierDetails?.trackingId || trackingId;
        if (newTrackingId !== undefined) {
            const cName = courierDetails?.courierName || courierName || '';
            const cNotes = courierDetails?.notes || notes || '';
            if (!booking.metadata)
                booking.metadata = {};
            if (!Array.isArray(booking.metadata.trackingHistory)) {
                booking.metadata.trackingHistory = [];
            }
            booking.metadata.trackingHistory.unshift({
                trackingId: String(newTrackingId).trim(),
                previousTrackingId: booking.courierDetails?.trackingId || null,
                courierName: String(cName).trim(),
                notes: String(cNotes).trim(),
                updatedAt: new Date(),
                updatedBy: 'ADMIN',
            });
            booking.courierDetails = {
                trackingId: String(newTrackingId).trim(),
                courierName: String(cName).trim(),
                notes: String(cNotes).trim(),
                submittedAt: booking.courierDetails?.submittedAt || new Date(),
            };
            booking.markModified('metadata');
        }
        await booking.save();
        await booking.populate('userId', 'firstName lastName email');
        if (status === 'COLLECTED' && booking && booking.userId) {
            try {
                const user = booking.userId;
                const customerName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
                if (user.email) {
                    await sendSampleCollectedEmail(user.email, {
                        customerName,
                        bookingId: booking._id.toString(),
                    });
                }
            }
            catch (e) {
                console.error('Failed to send sample collected email:', e);
            }
        }
        if (notifyDelay && booking && booking.userId) {
            try {
                const user = booking.userId;
                const customerName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
                if (user.email) {
                    await sendCollectionDelayedEmail(user.email, {
                        customerName,
                        bookingId: booking._id.toString(),
                    });
                }
            }
            catch (e) {
                console.error('Failed to send collection delayed email:', e);
            }
        }
        res.status(200).json({
            success: true,
            message: 'Collection details updated successfully',
            data: booking,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update collection details',
            error: error.message,
        });
    }
};
exports.updateCollectionDetails = updateCollectionDetails;
// -----------------------------------------
// NEW: Test & Package Approvals
// -----------------------------------------
const getPendingApprovals = async (req, res) => {
    try {
        const { default: Test } = await Promise.resolve().then(() => __importStar(require('../models/Test')));
        const { default: Package } = await Promise.resolve().then(() => __importStar(require('../models/Package')));
        const { ApprovalStatus } = await Promise.resolve().then(() => __importStar(require('../types')));
        const pendingTests = await Test.find({ approvalStatus: ApprovalStatus.PENDING })
            .populate('labId', 'labName')
            .sort('-createdAt');
        const pendingPackages = await Package.find({ approvalStatus: ApprovalStatus.PENDING })
            .populate('createdBy', 'firstName lastName email')
            .sort('-createdAt');
        res.status(200).json({
            success: true,
            data: {
                tests: pendingTests,
                packages: pendingPackages
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch pending approvals', error: error.message });
    }
};
exports.getPendingApprovals = getPendingApprovals;
const approveTest = async (req, res) => {
    try {
        const { default: Test } = await Promise.resolve().then(() => __importStar(require('../models/Test')));
        const { ApprovalStatus } = await Promise.resolve().then(() => __importStar(require('../types')));
        const test = await Test.findByIdAndUpdate(req.params.id, { approvalStatus: ApprovalStatus.APPROVED, $unset: { rejectionReason: 1 } }, { new: true });
        if (!test) {
            res.status(404).json({ success: false, message: 'Test not found' });
            return;
        }
        res.status(200).json({ success: true, message: 'Test approved successfully', data: test });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to approve test', error: error.message });
    }
};
exports.approveTest = approveTest;
const rejectTest = async (req, res) => {
    try {
        const { default: Test } = await Promise.resolve().then(() => __importStar(require('../models/Test')));
        const { ApprovalStatus } = await Promise.resolve().then(() => __importStar(require('../types')));
        const { reason } = req.body;
        if (!reason) {
            res.status(400).json({ success: false, message: 'Rejection reason is required' });
            return;
        }
        const test = await Test.findByIdAndUpdate(req.params.id, { approvalStatus: ApprovalStatus.REJECTED, rejectionReason: reason }, { new: true });
        if (!test) {
            res.status(404).json({ success: false, message: 'Test not found' });
            return;
        }
        res.status(200).json({ success: true, message: 'Test rejected successfully', data: test });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to reject test', error: error.message });
    }
};
exports.rejectTest = rejectTest;
const approvePackage = async (req, res) => {
    try {
        const { default: Package } = await Promise.resolve().then(() => __importStar(require('../models/Package')));
        const { ApprovalStatus } = await Promise.resolve().then(() => __importStar(require('../types')));
        const pkg = await Package.findByIdAndUpdate(req.params.id, { approvalStatus: ApprovalStatus.APPROVED, $unset: { rejectionReason: 1 } }, { new: true });
        if (!pkg) {
            res.status(404).json({ success: false, message: 'Package not found' });
            return;
        }
        res.status(200).json({ success: true, message: 'Package approved successfully', data: pkg });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to approve package', error: error.message });
    }
};
exports.approvePackage = approvePackage;
const rejectPackage = async (req, res) => {
    try {
        const { default: Package } = await Promise.resolve().then(() => __importStar(require('../models/Package')));
        const { ApprovalStatus } = await Promise.resolve().then(() => __importStar(require('../types')));
        const { reason } = req.body;
        if (!reason) {
            res.status(400).json({ success: false, message: 'Rejection reason is required' });
            return;
        }
        const pkg = await Package.findByIdAndUpdate(req.params.id, { approvalStatus: ApprovalStatus.REJECTED, rejectionReason: reason }, { new: true });
        if (!pkg) {
            res.status(404).json({ success: false, message: 'Package not found' });
            return;
        }
        res.status(200).json({ success: true, message: 'Package rejected successfully', data: pkg });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to reject package', error: error.message });
    }
};
exports.rejectPackage = rejectPackage;
