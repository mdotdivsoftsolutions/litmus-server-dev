"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadBookingReport = exports.updateCourierTracking = exports.getBookingById = exports.getMyBookings = exports.createBooking = void 0;
const path_1 = __importDefault(require("path"));
const client_s3_1 = require("@aws-sdk/client-s3");
const Booking_1 = __importDefault(require("../models/Booking"));
const Laboratory_1 = __importDefault(require("../models/Laboratory"));
const Test_1 = __importDefault(require("../models/Test"));
const Package_1 = __importDefault(require("../models/Package"));
const types_1 = require("../types");
const notification_service_1 = __importDefault(require("../services/notification.service"));
const PlatformSettings_1 = require("../models/PlatformSettings");
const spaces_1 = __importDefault(require("../config/spaces"));
const bookingRules_1 = require("../utils/bookingRules");
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
        let status = types_1.BookingStatus.PENDING;
        if (labId === 'admin') {
            labId = undefined; // Litmus Smart Allocation
        }
        else if (labId) {
            const lab = await Laboratory_1.default.findById(labId);
            if (lab && lab.isAutoBooking) {
                status = types_1.BookingStatus.IN_PROGRESS; // Auto-approved and moved to lab side
            }
        }
        const collectionMethod = metadata?.collectionMethod || metadata?.collectionDetails?.collectionMethod;
        const collectionCity = metadata?.collectionDetails?.city || '';
        let collectionStatus = (0, bookingRules_1.collectionStatusForMethod)(collectionMethod);
        if (collectionMethod === 'PICKUP') {
            const settings = await (0, PlatformSettings_1.getPlatformSettings)();
            if (!(0, bookingRules_1.isPickupCityCovered)(collectionCity, settings.pickupCities || [])) {
                res.status(400).json({
                    success: false,
                    message: `Pickup is not available in ${collectionCity || 'this city'}. Use courier, or choose a covered city.`,
                });
                return;
            }
        }
        const booking = await Booking_1.default.create({
            userId,
            labId,
            items,
            bookingDate,
            totalAmount,
            metadata,
            status,
            collectionStatus,
            collectionMethod: collectionMethod === 'PICKUP' || collectionMethod === 'COURIER' ? collectionMethod : undefined,
        });
        try {
            const populatedBooking = await Booking_1.default.findById(booking._id)
                .populate('userId', 'firstName lastName email phone')
                .populate('items.testId', 'testName')
                .populate('items.packageId', 'name');
            if (populatedBooking && populatedBooking.userId) {
                const user = populatedBooking.userId;
                const customerName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Valued Customer';
                const testNames = populatedBooking.items.map(item => {
                    if (item.testId)
                        return item.testId.testName;
                    if (item.packageId)
                        return item.packageId.name;
                    return 'Diagnostic Test';
                }).filter(Boolean).join(', ');
                const productNames = populatedBooking.items.map(item => {
                    return item.samples?.map(s => s.productName).filter(Boolean).join(', ');
                }).filter(Boolean).join(', ');
                const totalSamples = populatedBooking.items.reduce((total, item) => {
                    return total + (item.samples?.reduce((sum, s) => sum + (Number(s.quantity) || 1), 0) || 0);
                }, 0);
                notification_service_1.default.notifyOrderConfirmation({
                    customerEmail: user.email,
                    customerPhone: user.phone,
                    customerName,
                    bookingId: booking._id.toString(),
                    productName: productNames || 'Diagnostic Sample',
                    testNames: testNames || 'Food Quality & Safety Diagnostics',
                    sampleQty: totalSamples.toString(),
                    amount: booking.totalAmount,
                    bookingDate: new Date(bookingDate).toLocaleDateString('en-IN'),
                }).catch(() => { });
            }
        }
        catch (notifErr) {
            console.error('Error dispatching booking confirmation notification:', notifErr);
        }
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
        const { page, limit, search, status, reportsOnly } = (0, bookingRules_1.parseBookingListParams)(req.query);
        const filter = { userId, ...(0, bookingRules_1.bookingListStatusFilter)(status, reportsOnly) };
        if (search) {
            const escaped = (0, bookingRules_1.escapeRegex)(search);
            const rx = new RegExp(escaped, 'i');
            const [tests, packages] = await Promise.all([
                Test_1.default.find({ testName: rx }).select('_id'),
                Package_1.default.find({ name: rx }).select('_id'),
            ]);
            const or = [
                { 'items.samples.productName': rx },
            ];
            if (tests.length)
                or.push({ 'items.testId': { $in: tests.map((t) => t._id) } });
            if (packages.length)
                or.push({ 'items.packageId': { $in: packages.map((p) => p._id) } });
            const hex = search.replace(/[^a-f0-9]/gi, '');
            if (hex.length >= 6) {
                or.push({
                    $expr: {
                        $regexMatch: { input: { $toString: '$_id' }, regex: hex, options: 'i' },
                    },
                });
            }
            filter.$or = or;
        }
        const total = await Booking_1.default.countDocuments(filter);
        const pages = Math.max(1, Math.ceil(total / limit));
        const safePage = Math.min(page, pages);
        const skip = (safePage - 1) * limit;
        const bookings = await Booking_1.default.find(filter)
            .populate('labId', 'labName location')
            .populate('items.testId', 'testName price metadata')
            .populate('items.packageId', 'name tests')
            .sort('-createdAt')
            .skip(skip)
            .limit(limit);
        const sanitizedBookings = bookings.map((b) => (0, bookingRules_1.sanitizeBookingReports)(b.toObject()));
        res.status(200).json({
            success: true,
            count: sanitizedBookings.length,
            total,
            page: safePage,
            pages,
            limit,
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
            delete obj.reportSummary;
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
const updateCourierTracking = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { trackingId, courierName, notes } = req.body;
        const booking = await Booking_1.default.findById(req.params.id);
        const access = (0, bookingRules_1.canAddCourierTracking)({
            trackingId,
            userId,
            bookingUserId: booking?.userId?.toString(),
            collectionMethod: booking?.collectionMethod,
            metadataCollectionMethod: booking?.metadata?.collectionMethod,
        });
        if (!access.ok) {
            res.status(access.status).json({ success: false, message: access.message });
            return;
        }
        if (!booking)
            return;
        if (!booking.metadata)
            booking.metadata = {};
        if (!Array.isArray(booking.metadata.trackingHistory)) {
            booking.metadata.trackingHistory = [];
        }
        const previousTracking = booking.courierDetails?.trackingId;
        booking.metadata.trackingHistory.unshift({
            trackingId: String(trackingId).trim(),
            previousTrackingId: previousTracking || null,
            courierName: courierName ? String(courierName).trim() : '',
            notes: notes ? String(notes).trim() : '',
            updatedAt: new Date(),
            updatedBy: 'USER',
        });
        booking.courierDetails = {
            trackingId: String(trackingId).trim(),
            courierName: courierName ? String(courierName).trim() : '',
            notes: notes ? String(notes).trim() : '',
            submittedAt: booking.courierDetails?.submittedAt || new Date(),
        };
        booking.collectionStatus = types_1.CollectionStatus.SHIPPED;
        booking.markModified('metadata');
        await booking.save();
        res.status(200).json({
            success: true,
            message: 'Courier tracking saved',
            data: booking,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to save tracking details',
            error: error.message,
        });
    }
};
exports.updateCourierTracking = updateCourierTracking;
const downloadBookingReport = async (req, res) => {
    try {
        const booking = await Booking_1.default.findById(req.params.id);
        const access = (0, bookingRules_1.canDownloadBookingReport)({
            bookingExists: Boolean(booking),
            ownerId: booking?.userId?.toString(),
            requesterId: req.user?.id,
            requesterRole: req.user?.role,
            isReportApprovedByAdmin: booking?.isReportApprovedByAdmin,
            reportFiles: booking?.reportFiles,
        });
        if (!access.ok) {
            res.status(access.status).json({ success: false, message: access.message });
            return;
        }
        if (!booking)
            return;
        const fileUrl = booking.reportFiles?.[0];
        if (!fileUrl) {
            res.status(404).json({ success: false, message: 'Report file not found' });
            return;
        }
        const parsed = new URL(fileUrl);
        const key = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
        const ext = path_1.default.extname(key) || path_1.default.extname(parsed.pathname) || '.pdf';
        const filename = `litmus-report-${booking._id.toString().slice(-6)}${ext}`;
        const encoded = encodeURIComponent(filename);
        const bucketName = process.env.DO_SPACES_NAME;
        if (bucketName && key.startsWith('litmus_uploads/')) {
            const obj = await spaces_1.default.send(new client_s3_1.GetObjectCommand({ Bucket: bucketName, Key: key }));
            if (!obj.Body) {
                res.status(404).json({ success: false, message: 'Report file not found' });
                return;
            }
            const bytes = await obj.Body.transformToByteArray();
            res.setHeader('Content-Type', obj.ContentType || 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encoded}`);
            res.setHeader('Content-Length', String(bytes.byteLength));
            res.setHeader('Cache-Control', 'no-store');
            res.send(Buffer.from(bytes));
            return;
        }
        const remote = await fetch(fileUrl);
        if (!remote.ok) {
            res.status(404).json({ success: false, message: 'Report file not found' });
            return;
        }
        const buffer = Buffer.from(await remote.arrayBuffer());
        res.setHeader('Content-Type', remote.headers.get('content-type') || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encoded}`);
        res.setHeader('Content-Length', String(buffer.byteLength));
        res.setHeader('Cache-Control', 'no-store');
        res.send(buffer);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to download report',
            error: error.message,
        });
    }
};
exports.downloadBookingReport = downloadBookingReport;
