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
exports.getLabAvailability = exports.submitBookingResult = exports.deleteLab = exports.updateLab = exports.getLabByIdPublic = exports.getLabsPublic = exports.getLabById = exports.getLabs = exports.createLab = void 0;
const Laboratory_1 = __importDefault(require("../models/Laboratory"));
const User_1 = __importDefault(require("../models/User"));
const types_1 = require("../types");
const mailer_1 = require("../utils/mailer");
const createLab = async (req, res) => {
    try {
        let generatedPassword = '';
        // Create a User account if email is provided
        if (req.body.contactEmail && req.body.contactPhone && req.body.labName) {
            const existingUser = await User_1.default.findOne({ email: req.body.contactEmail });
            if (existingUser) {
                res.status(400).json({
                    success: false,
                    message: 'User with this email already exists',
                });
                return;
            }
            const rawPassword = req.body.password || `${req.body.labName.substring(0, 4).replace(/\s/g, '')}${req.body.contactPhone.substring(0, 4)}${req.body.startingYear || ''}`;
            if (!req.body.password) {
                generatedPassword = rawPassword;
            }
            const user = new User_1.default({
                firstName: req.body.labName,
                email: req.body.contactEmail,
                phone: req.body.contactPhone,
                password: rawPassword,
                role: types_1.UserRole.LAB,
            });
            await user.save();
            req.body.userId = user._id;
        }
        else if (!req.body.userId) {
            res.status(400).json({
                success: false,
                message: 'Contact email, phone, and lab name are required to create a lab account.',
            });
            return;
        }
        const lab = await Laboratory_1.default.create(req.body);
        if (req.body.contactEmail) {
            (0, mailer_1.sendLabWelcomeEmail)(req.body.contactEmail, req.body.labName, generatedPassword || undefined);
        }
        res.status(201).json({
            success: true,
            data: lab,
            generatedPassword: generatedPassword || undefined,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Failed to create laboratory',
            error: error.message,
        });
    }
};
exports.createLab = createLab;
const getLabs = async (req, res) => {
    try {
        const labs = await Laboratory_1.default.find({ isDeleted: { $ne: true } }).populate('tests');
        res.status(200).json({
            success: true,
            count: labs.length,
            data: labs,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch laboratories',
            error: error.message,
        });
    }
};
exports.getLabs = getLabs;
const getLabById = async (req, res) => {
    try {
        const lab = await Laboratory_1.default.findById(req.params.id).populate('tests');
        if (!lab) {
            res.status(404).json({
                success: false,
                message: 'Laboratory not found',
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: lab,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch laboratory',
            error: error.message,
        });
    }
};
exports.getLabById = getLabById;
// Helper function for Haversine distance
const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
};
const getLabsPublic = async (req, res) => {
    try {
        const query = { isDeleted: { $ne: true }, isActive: true };
        if (req.query.isTrusted === 'true') {
            query.isTrusted = true;
        }
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            query.$or = [
                { labName: searchRegex },
                { 'location.city': searchRegex },
            ];
        }
        let labs = await Laboratory_1.default.find(query).populate('tests');
        // Check if location based sorting is requested
        const lat = req.query.lat ? parseFloat(req.query.lat) : null;
        const lng = req.query.lng ? parseFloat(req.query.lng) : null;
        // Also check for the text 'location' param just in case
        const locationStr = req.query.location;
        if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
            // Sort labs by distance
            labs.sort((a, b) => {
                const aLoc = a.location || {};
                const bLoc = b.location || {};
                const aLat = aLoc.latitude || aLoc.lat;
                const aLng = aLoc.longitude || aLoc.lng;
                const bLat = bLoc.latitude || bLoc.lat;
                const bLng = bLoc.longitude || bLoc.lng;
                if (aLat !== undefined && aLng !== undefined && bLat !== undefined && bLng !== undefined) {
                    const distA = getDistance(lat, lng, aLat, aLng);
                    const distB = getDistance(lat, lng, bLat, bLng);
                    return distA - distB;
                }
                // Push labs without proper coordinates to the end
                if (aLat === undefined)
                    return 1;
                if (bLat === undefined)
                    return -1;
                return 0;
            });
        }
        else if (locationStr) {
            // Basic text filter fallback if just location=kochi is passed
            labs = labs.filter(lab => {
                const locString = JSON.stringify(lab.location).toLowerCase();
                return locString.includes(locationStr.toLowerCase());
            });
        }
        const page = parseInt(req.query.page, 10) || 1;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 0;
        const total = labs.length;
        if (limit > 0) {
            const skip = (page - 1) * limit;
            labs = labs.slice(skip, skip + limit);
        }
        res.status(200).json({
            success: true,
            count: labs.length,
            total,
            page,
            pages: limit > 0 ? Math.ceil(total / limit) : 1,
            data: labs,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch laboratories',
            error: error.message,
        });
    }
};
exports.getLabsPublic = getLabsPublic;
const getLabByIdPublic = async (req, res) => {
    try {
        const lab = await Laboratory_1.default.findById(req.params.id).populate('tests');
        if (!lab || lab.isDeleted || !lab.isActive) {
            res.status(404).json({
                success: false,
                message: 'Laboratory not found',
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: lab,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch laboratory',
            error: error.message,
        });
    }
};
exports.getLabByIdPublic = getLabByIdPublic;
const updateLab = async (req, res) => {
    try {
        const lab = await Laboratory_1.default.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!lab) {
            res.status(404).json({
                success: false,
                message: 'Laboratory not found',
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: lab,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Failed to update laboratory',
            error: error.message,
        });
    }
};
exports.updateLab = updateLab;
const deleteLab = async (req, res) => {
    try {
        const lab = await Laboratory_1.default.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
        if (!lab) {
            res.status(404).json({
                success: false,
                message: 'Laboratory not found',
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: {},
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete laboratory',
            error: error.message,
        });
    }
};
exports.deleteLab = deleteLab;
const submitBookingResult = async (req, res) => {
    try {
        const { reportUrl } = req.body;
        if (!reportUrl) {
            res.status(400).json({
                success: false,
                message: 'Please provide a reportUrl',
            });
            return;
        }
        Promise.resolve().then(() => __importStar(require('../models/Booking'))).then(async ({ default: Booking }) => {
            const { sendTestReportReadyEmail } = await Promise.resolve().then(() => __importStar(require('../utils/mailer')));
            const booking = await Booking.findById(req.params.bookingId).populate('labId').populate('userId', 'firstName lastName email');
            if (!booking) {
                res.status(404).json({
                    success: false,
                    message: 'Booking not found',
                });
                return;
            }
            const lab = booking.labId;
            if (!booking.reportFiles) {
                booking.reportFiles = [];
            }
            booking.reportFiles.push(reportUrl);
            const requiresAdminApproval = lab.requiresAdminApprovalForReport !== undefined ? lab.requiresAdminApprovalForReport : true;
            if (requiresAdminApproval) {
                booking.isReportApprovedByAdmin = false;
                Promise.resolve().then(() => __importStar(require('../types'))).then(({ BookingStatus }) => {
                    booking.status = BookingStatus.IN_PROGRESS;
                    booking.save().then((updatedBooking) => {
                        res.status(200).json({
                            success: true,
                            message: 'Result submitted and pending admin approval',
                            data: updatedBooking,
                        });
                    });
                });
            }
            else {
                booking.isReportApprovedByAdmin = true;
                Promise.resolve().then(() => __importStar(require('../types'))).then(({ BookingStatus }) => {
                    booking.status = BookingStatus.COMPLETED;
                    booking.save().then(async (updatedBooking) => {
                        if (updatedBooking.userId) {
                            try {
                                const user = updatedBooking.userId;
                                if (user.email) {
                                    const customerName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
                                    await sendTestReportReadyEmail(user.email, {
                                        customerName,
                                        bookingId: updatedBooking._id.toString(),
                                    });
                                }
                            }
                            catch (e) {
                                console.error('Failed to send report ready email:', e);
                            }
                        }
                        res.status(200).json({
                            success: true,
                            message: 'Result submitted and approved automatically',
                            data: updatedBooking,
                        });
                    });
                });
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to submit result',
            error: error.message,
        });
    }
};
exports.submitBookingResult = submitBookingResult;
const getLabAvailability = async (req, res) => {
    try {
        const { id } = req.params;
        const { date } = req.query;
        if (!date) {
            res.status(400).json({
                success: false,
                message: 'Please provide a date query parameter (YYYY-MM-DD)',
            });
            return;
        }
        const lab = await Laboratory_1.default.findById(id);
        if (!lab || lab.isDeleted || !lab.isActive) {
            res.status(404).json({
                success: false,
                message: 'Laboratory not found',
            });
            return;
        }
        // Count bookings for this lab on the given date
        const targetDate = new Date(date);
        const nextDate = new Date(targetDate);
        nextDate.setDate(nextDate.getDate() + 1);
        Promise.resolve().then(() => __importStar(require('../models/Booking'))).then(async ({ default: Booking }) => {
            Promise.resolve().then(() => __importStar(require('../types'))).then(async ({ BookingStatus }) => {
                // Find active bookings (not cancelled/rejected)
                const bookingCount = await Booking.countDocuments({
                    labId: id,
                    bookingDate: {
                        $gte: targetDate,
                        $lt: nextDate,
                    },
                    status: { $nin: [BookingStatus.CANCELLED, BookingStatus.REJECTED] },
                });
                const dailyLimit = lab.dailyLimit || 0;
                const isAvailable = dailyLimit === 0 || bookingCount < dailyLimit;
                res.status(200).json({
                    success: true,
                    data: {
                        labId: id,
                        date,
                        bookingCount,
                        dailyLimit,
                        isAvailable,
                    },
                });
            });
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to check lab availability',
            error: error.message,
        });
    }
};
exports.getLabAvailability = getLabAvailability;
