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
exports.addExistingPackageToLab = exports.addExistingTestToLab = exports.getPlatformPackages = exports.getPlatformTests = exports.updateMyLabPackage = exports.createMyLabPackage = exports.getMyLabPackages = exports.updateMyLabTest = exports.createMyLabTest = exports.getMyLabTests = exports.updateCollectionDetails = exports.updateMyLabProfile = exports.getMyLabProfile = exports.updateBookingStatus = exports.getMyLabBookings = exports.getLabDashboardStats = exports.getLabForRequest = void 0;
const Laboratory_1 = __importDefault(require("../models/Laboratory"));
const Booking_1 = __importDefault(require("../models/Booking"));
const types_1 = require("../types");
const User_1 = __importDefault(require("../models/User"));
const Test_1 = __importDefault(require("../models/Test"));
const Package_1 = __importDefault(require("../models/Package"));
const getLabForRequest = async (req) => {
    const userLabId = req.user?.labId;
    const userId = req.user?.id;
    if (userLabId) {
        const lab = await Laboratory_1.default.findById(userLabId);
        if (lab)
            return lab;
    }
    if (userId) {
        let lab = await Laboratory_1.default.findOne({ userId });
        if (lab)
            return lab;
        const user = await User_1.default.findById(userId);
        if (user?.email) {
            lab = await Laboratory_1.default.findOne({ contactEmail: user.email.toLowerCase().trim() });
            if (lab) {
                if (!lab.userId && user.role === types_1.UserRole.LAB) {
                    lab.userId = user._id;
                    await lab.save();
                }
                if (!user.labId) {
                    user.labId = lab._id;
                    await user.save();
                }
                return lab;
            }
        }
    }
    return null;
};
exports.getLabForRequest = getLabForRequest;
const getLabDashboardStats = async (req, res) => {
    try {
        const lab = await (0, exports.getLabForRequest)(req);
        if (!lab) {
            res.status(404).json({ success: false, message: 'Laboratory not found for this user' });
            return;
        }
        const bookings = await Booking_1.default.find({ labId: lab._id })
            .populate('userId', 'firstName lastName email phone')
            .populate('items.testId', 'testName price')
            .populate('items.packageId', 'name price')
            .sort('-createdAt');
        const totalBookings = bookings.length;
        const newBookings = bookings.filter(b => b.status === types_1.BookingStatus.PENDING || b.status === types_1.BookingStatus.APPROVED).length;
        const inProgressTests = bookings.filter(b => b.status === types_1.BookingStatus.IN_PROGRESS).length;
        const completedTests = bookings.filter(b => b.status === types_1.BookingStatus.COMPLETED).length;
        // Completed today
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const completedToday = bookings.filter(b => {
            if (b.status !== types_1.BookingStatus.COMPLETED)
                return false;
            const dateToCheck = b.metadata?.completedAt ? new Date(b.metadata.completedAt) : new Date(b.updatedAt || b.createdAt);
            return dateToCheck >= startOfToday;
        }).length;
        // Total earnings & revenue this month
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        let totalRevenue = 0;
        let revenueThisMonth = 0;
        for (const b of bookings) {
            const isPaid = (b.paymentStatus || '').toUpperCase() === 'SUCCESS' || (b.paymentStatus || '').toUpperCase() === 'PAID' || b.status === types_1.BookingStatus.COMPLETED;
            const amount = b.totalAmount || (b.items || []).reduce((sum, item) => sum + (item.price || 0), 0) || 0;
            if (isPaid) {
                totalRevenue += amount;
                const bDate = new Date(b.createdAt);
                if (bDate >= startOfThisMonth) {
                    revenueThisMonth += amount;
                }
            }
        }
        // Associated Tests, Packages, Employees
        const totalTests = await Test_1.default.countDocuments({
            $or: [
                { _id: { $in: lab.tests || [] } },
                { labId: lab._id }
            ]
        });
        const totalPackages = await Package_1.default.countDocuments({
            $or: [
                { labId: lab._id },
                { _id: { $in: lab.packages || [] } }
            ]
        });
        const totalEmployees = await User_1.default.countDocuments({
            labId: lab._id,
            role: { $in: [types_1.UserRole.LAB, types_1.UserRole.LAB_EMPLOYEE] }
        });
        // Schedule / Upcoming active jobs
        const activeSchedule = bookings.filter(b => [types_1.BookingStatus.PENDING, types_1.BookingStatus.APPROVED, types_1.BookingStatus.IN_PROGRESS].includes(b.status)).length;
        // Recent 5-6 bookings formatted
        const recentBookings = bookings.slice(0, 6).map(b => {
            const userObj = b.userId;
            const userName = `${userObj?.firstName || ''} ${userObj?.lastName || ''}`.trim() || b.collectionDetails?.name || 'Customer';
            const productNames = b.items?.map((i) => i.samples?.[0]?.productName || i.packageId?.name || i.testId?.testName || i.testId?.name).filter(Boolean);
            const product = productNames?.length > 0 ? productNames.join(', ') : 'Diagnostic Order';
            const testsCount = b.items?.reduce((count, i) => count + (i.samples?.reduce((sc, s) => sc + (s.selectedParameters?.length || 1), 0) || 1), 0) || 0;
            return {
                id: b._id,
                displayId: `BKG-${b._id.toString().substring(b._id.toString().length - 6).toUpperCase()}`,
                user: userName,
                tests: `${testsCount} test${testsCount === 1 ? '' : 's'}`,
                product,
                status: b.status,
                createdAt: b.createdAt,
                totalAmount: b.totalAmount,
                hasReport: Boolean(b.reportFiles?.length || b.reportUrl || b.metadata?.reportUrl),
            };
        });
        // Pending uploads (bookings in APPROVED, IN_PROGRESS, or COMPLETED without report uploaded)
        const pendingUploads = bookings
            .filter(b => {
            const hasReport = Boolean(b.reportFiles?.length || b.reportUrl || b.metadata?.reportUrl);
            return !hasReport && [types_1.BookingStatus.APPROVED, types_1.BookingStatus.IN_PROGRESS, types_1.BookingStatus.COMPLETED].includes(b.status);
        })
            .slice(0, 5)
            .map(b => {
            const userObj = b.userId;
            const userName = `${userObj?.firstName || ''} ${userObj?.lastName || ''}`.trim() || b.collectionDetails?.name || 'Customer';
            const productNames = b.items?.map((i) => i.samples?.[0]?.productName || i.packageId?.name || i.testId?.testName || i.testId?.name).filter(Boolean);
            const product = productNames?.length > 0 ? productNames.join(', ') : 'Diagnostic Test';
            return {
                id: b._id,
                displayId: `BKG-${b._id.toString().substring(b._id.toString().length - 6).toUpperCase()}`,
                user: userName,
                product,
                status: b.status,
                dueDate: b.collectionDetails?.preferredDate || b.createdAt,
                createdAt: b.createdAt,
            };
        });
        // Weekly Load for the last 7 days
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weeklyLoad = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayName = daysOfWeek[d.getDay()];
            const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
            const count = bookings.filter(b => {
                const bDate = new Date(b.createdAt);
                return bDate >= dayStart && bDate <= dayEnd;
            }).length;
            weeklyLoad.push({
                day: dayName,
                date: d.toISOString().split('T')[0],
                bookings: count,
            });
        }
        res.status(200).json({
            success: true,
            data: {
                totalBookings,
                newBookings,
                inProgressTests,
                completedTests,
                completedToday,
                totalRevenue,
                revenueThisMonth,
                totalTests,
                totalPackages,
                totalEmployees,
                activeSchedule,
                recentBookings,
                pendingUploads,
                weeklyLoad,
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
        const lab = await (0, exports.getLabForRequest)(req);
        if (!lab) {
            res.status(404).json({ success: false, message: 'Laboratory not found for this user' });
            return;
        }
        const bookings = await Booking_1.default.find({ labId: lab._id })
            .populate('userId', 'firstName lastName email phone')
            .populate('items.testId', 'testName price metadata')
            .populate({
            path: 'items.packageId',
            select: 'name price tests features',
            populate: {
                path: 'tests',
                select: 'testName metadata'
            }
        })
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
const updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const lab = await (0, exports.getLabForRequest)(req);
        if (!lab) {
            res.status(404).json({ success: false, message: 'Laboratory not found for this user' });
            return;
        }
        const booking = await Booking_1.default.findOne({ _id: id, labId: lab._id });
        if (!booking) {
            res.status(404).json({ success: false, message: 'Booking not found or not assigned to this lab' });
            return;
        }
        if (!Object.values(types_1.BookingStatus).includes(status)) {
            res.status(400).json({ success: false, message: 'Invalid booking status' });
            return;
        }
        booking.status = status;
        if (!booking.metadata)
            booking.metadata = {};
        if (status === types_1.BookingStatus.IN_PROGRESS && !booking.metadata.testingStartedAt) {
            booking.metadata.testingStartedAt = new Date();
        }
        if (status === types_1.BookingStatus.COMPLETED && !booking.metadata.completedAt) {
            booking.metadata.completedAt = new Date();
        }
        booking.markModified('metadata');
        await booking.save();
        res.status(200).json({
            success: true,
            message: 'Booking status updated successfully',
            data: booking,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update booking status', error: error.message });
    }
};
exports.updateBookingStatus = updateBookingStatus;
const getMyLabProfile = async (req, res) => {
    try {
        const lab = await (0, exports.getLabForRequest)(req);
        if (!lab) {
            res.status(404).json({ success: false, message: 'Laboratory not found for this user' });
            return;
        }
        res.status(200).json({
            success: true,
            data: lab,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch lab profile', error: error.message });
    }
};
exports.getMyLabProfile = getMyLabProfile;
const updateMyLabProfile = async (req, res) => {
    try {
        const lab = await (0, exports.getLabForRequest)(req);
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
const updateCollectionDetails = async (req, res) => {
    try {
        const { status, collectorName, collectorContact, notifyDelay } = req.body;
        const { id } = req.params;
        const lab = await (0, exports.getLabForRequest)(req);
        if (!lab) {
            res.status(404).json({ success: false, message: 'Laboratory not found for this user' });
            return;
        }
        Promise.resolve().then(() => __importStar(require('../models/Booking'))).then(async ({ default: Booking }) => {
            const { sendSampleCollectedEmail, sendCollectionDelayedEmail } = await Promise.resolve().then(() => __importStar(require('../utils/mailer')));
            // Find the booking and make sure it belongs to this lab
            const booking = await Booking.findOne({ _id: id, labId: lab._id });
            if (!booking) {
                res.status(404).json({ success: false, message: 'Booking not found or not assigned to this lab' });
                return;
            }
            if (!booking.metadata)
                booking.metadata = {};
            if (status) {
                booking.collectionStatus = status;
                if ((status === 'COLLECTED' || status === 'REACHED') && !booking.metadata.sampleCollectedAt) {
                    booking.metadata.sampleCollectedAt = new Date();
                }
                if (status === 'ASSIGNED' && !booking.metadata.collectorAssignedAt) {
                    booking.metadata.collectorAssignedAt = new Date();
                }
            }
            if (collectorName !== undefined || collectorContact !== undefined) {
                booking.assignedCollector = {
                    name: collectorName,
                    contact: collectorContact
                };
                if (collectorName && !booking.metadata.collectorAssignedAt) {
                    booking.metadata.collectorAssignedAt = new Date();
                }
            }
            booking.markModified('metadata');
            await booking.save();
            await booking.populate('userId', 'firstName lastName email');
            if (status === 'COLLECTED' && booking.userId) {
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
            if (notifyDelay && booking.userId) {
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
const getMyLabTests = async (req, res) => {
    try {
        const lab = await (0, exports.getLabForRequest)(req);
        if (!lab) {
            res.status(404).json({ success: false, message: 'Laboratory not found' });
            return;
        }
        const tests = await Test_1.default.find({
            $or: [
                { _id: { $in: lab.tests } },
                { labId: lab._id }
            ]
        }).sort('-createdAt');
        res.status(200).json({ success: true, data: tests });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch tests', error: error.message });
    }
};
exports.getMyLabTests = getMyLabTests;
const createMyLabTest = async (req, res) => {
    try {
        const lab = await (0, exports.getLabForRequest)(req);
        if (!lab) {
            res.status(404).json({ success: false, message: 'Laboratory not found' });
            return;
        }
        const testData = {
            ...req.body,
            labId: lab._id,
            creatorType: 'LAB',
            approvalStatus: types_1.ApprovalStatus.PENDING
        };
        const test = await Test_1.default.create(testData);
        // Auto-associate test with lab
        lab.tests.push(test._id);
        await lab.save();
        res.status(201).json({ success: true, data: test });
    }
    catch (error) {
        res.status(400).json({ success: false, message: 'Failed to create test', error: error.message });
    }
};
exports.createMyLabTest = createMyLabTest;
const updateMyLabTest = async (req, res) => {
    try {
        const lab = await (0, exports.getLabForRequest)(req);
        if (!lab) {
            res.status(404).json({ success: false, message: 'Laboratory not found' });
            return;
        }
        const test = await Test_1.default.findOne({ _id: req.params.id, labId: lab._id });
        if (!test) {
            res.status(404).json({ success: false, message: 'Test not found' });
            return;
        }
        Object.assign(test, req.body);
        test.approvalStatus = types_1.ApprovalStatus.PENDING; // Require re-approval on edit
        await test.save();
        res.status(200).json({ success: true, data: test });
    }
    catch (error) {
        res.status(400).json({ success: false, message: 'Failed to update test', error: error.message });
    }
};
exports.updateMyLabTest = updateMyLabTest;
const getMyLabPackages = async (req, res) => {
    try {
        const userId = req.user?.id;
        const lab = await (0, exports.getLabForRequest)(req);
        if (!lab) {
            res.status(404).json({ success: false, message: 'Laboratory not found' });
            return;
        }
        const packages = await Package_1.default.find({
            $or: [
                { createdBy: userId },
                { labId: lab._id },
                { _id: { $in: lab.packages || [] } }
            ]
        }).sort('-createdAt');
        res.status(200).json({ success: true, data: packages });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch packages', error: error.message });
    }
};
exports.getMyLabPackages = getMyLabPackages;
const createMyLabPackage = async (req, res) => {
    try {
        const userId = req.user?.id;
        const lab = await (0, exports.getLabForRequest)(req);
        const packageData = {
            ...req.body,
            createdBy: userId,
            labId: lab?._id,
            approvalStatus: types_1.ApprovalStatus.PENDING
        };
        const newPackage = await Package_1.default.create(packageData);
        if (lab) {
            if (!lab.packages)
                lab.packages = [];
            lab.packages.push(newPackage._id);
            await lab.save();
        }
        res.status(201).json({ success: true, data: newPackage });
    }
    catch (error) {
        res.status(400).json({ success: false, message: 'Failed to create package', error: error.message });
    }
};
exports.createMyLabPackage = createMyLabPackage;
const updateMyLabPackage = async (req, res) => {
    try {
        const userId = req.user?.id;
        const lab = await (0, exports.getLabForRequest)(req);
        const pkg = await Package_1.default.findOne({
            _id: req.params.id,
            $or: [
                { createdBy: userId },
                ...(lab ? [{ labId: lab._id }] : [])
            ]
        });
        if (!pkg) {
            res.status(404).json({ success: false, message: 'Package not found' });
            return;
        }
        Object.assign(pkg, req.body);
        pkg.approvalStatus = types_1.ApprovalStatus.PENDING; // Require re-approval
        await pkg.save();
        res.status(200).json({ success: true, data: pkg });
    }
    catch (error) {
        res.status(400).json({ success: false, message: 'Failed to update package', error: error.message });
    }
};
exports.updateMyLabPackage = updateMyLabPackage;
const getPlatformTests = async (req, res) => {
    try {
        const lab = await (0, exports.getLabForRequest)(req);
        if (!lab) {
            res.status(404).json({ success: false, message: 'Laboratory not found' });
            return;
        }
        const tests = await Test_1.default.find({
            creatorType: 'ADMIN',
            _id: { $nin: lab.tests },
            $or: [
                { approvalStatus: types_1.ApprovalStatus.APPROVED },
                { approvalStatus: { $exists: false } }
            ]
        }).sort('-createdAt');
        res.status(200).json({ success: true, data: tests });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch platform tests', error: error.message });
    }
};
exports.getPlatformTests = getPlatformTests;
const getPlatformPackages = async (req, res) => {
    try {
        const lab = await (0, exports.getLabForRequest)(req);
        if (!lab) {
            res.status(404).json({ success: false, message: 'Laboratory not found' });
            return;
        }
        const adminUsers = await User_1.default.find({ role: types_1.UserRole.ADMIN });
        const adminUserIds = adminUsers.map(u => u._id);
        const adminUserIdStrings = adminUsers.map(u => u._id.toString());
        const query = {
            _id: { $nin: lab.packages || [] },
            $or: [
                { approvalStatus: types_1.ApprovalStatus.APPROVED },
                { approvalStatus: { $exists: false } }
            ]
        };
        if (adminUserIds.length > 0) {
            query.$and = [
                {
                    $or: [
                        { createdBy: { $in: [...adminUserIds, ...adminUserIdStrings] } },
                        { createdBy: { $exists: false } },
                        { createdBy: null },
                        { labId: { $exists: false } },
                        { labId: null }
                    ]
                }
            ];
        }
        else {
            query.$or = [
                ...(query.$or || []),
                { labId: { $exists: false } },
                { labId: null }
            ];
        }
        const packages = await Package_1.default.find(query).populate('tests', 'testName price offerPrice').sort('-createdAt');
        res.status(200).json({ success: true, data: packages });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch platform packages', error: error.message });
    }
};
exports.getPlatformPackages = getPlatformPackages;
const addExistingTestToLab = async (req, res) => {
    try {
        const { testId } = req.body;
        if (!testId) {
            res.status(400).json({ success: false, message: 'testId is required' });
            return;
        }
        const lab = await (0, exports.getLabForRequest)(req);
        if (!lab) {
            res.status(404).json({ success: false, message: 'Laboratory not found' });
            return;
        }
        const test = await Test_1.default.findById(testId);
        if (!test || test.creatorType !== 'ADMIN') {
            res.status(404).json({ success: false, message: 'Platform test not found' });
            return;
        }
        if (!lab.tests.includes(testId)) {
            lab.tests.push(testId);
            await lab.save();
        }
        res.status(200).json({ success: true, message: 'Test added successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to add test', error: error.message });
    }
};
exports.addExistingTestToLab = addExistingTestToLab;
const addExistingPackageToLab = async (req, res) => {
    try {
        const { packageId } = req.body;
        if (!packageId) {
            res.status(400).json({ success: false, message: 'packageId is required' });
            return;
        }
        const lab = await (0, exports.getLabForRequest)(req);
        if (!lab) {
            res.status(404).json({ success: false, message: 'Laboratory not found' });
            return;
        }
        if (!lab.packages) {
            lab.packages = [];
        }
        if (!lab.packages.includes(packageId)) {
            lab.packages.push(packageId);
            await lab.save();
        }
        res.status(200).json({ success: true, message: 'Package added to laboratory successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to add package', error: error.message });
    }
};
exports.addExistingPackageToLab = addExistingPackageToLab;
