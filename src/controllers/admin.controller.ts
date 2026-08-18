import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import { UserRole, BookingStatus, PaymentStatus } from '../types';

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, search, startDate, endDate } = req.query;
    const filter: any = { role: UserRole.USER };

    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
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

    const users = await User.find(filter).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message,
    });
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message,
    });
  }
};

export const updateUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, isActive } = req.body;

    if (!userId || isActive === undefined) {
      res.status(400).json({
        success: false,
        message: 'Please provide userId and isActive status',
      });
      return;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true, runValidators: true }
    );

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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: error.message,
    });
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, email, phone, password, role } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
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

    const newUser = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password, // Pre-save hook will hash it
      role: role || UserRole.USER,
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message,
    });
  }
};

export const getUserDetailedProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const { default: Booking } = await import('../models/Booking');
    const { default: Payment } = await import('../models/Payment');
    const { default: Cart } = await import('../models/Cart');
    const { Consultation } = await import('../models/Consultation');

    // Robust multi-key booking lookup
    const filterConditions: any[] = [
      { userId: user._id }
    ];
    if (typeof userId === 'string' && mongoose.Types.ObjectId.isValid(userId)) {
      filterConditions.push({ userId: new mongoose.Types.ObjectId(userId) });
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
      .populate('items.testId', 'name testName metadata price')
      .populate('items.packageId', 'name price')
      .sort('-createdAt');

    // Get payments linked to bookings
    const bookingIds = bookings.map(b => b._id);
    const dbPayments = await Payment.find({ bookingId: { $in: bookingIds } })
      .populate({
        path: 'bookingId',
        select: 'totalAmount status createdAt labId',
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

    const allPayments = [...dbPayments, ...synthesizedPayments].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    // Get abandoned cart
    const cart = await Cart.findOne({ $or: [{ userId: user._id }, { userId }] })
      .populate('items.testId', 'name testName price')
      .populate('items.packageId', 'name price');

    // Get any consultations requested by this user
    const consultationFilters: any[] = [];
    if (user.email) consultationFilters.push({ email: user.email.toLowerCase() });
    if (user.phone) consultationFilters.push({ phone: user.phone });
    
    let consultations: any[] = [];
    if (consultationFilters.length > 0) {
      consultations = await Consultation.find({ $or: consultationFilters }).sort('-createdAt');
    }

    // Calculate comprehensive stats
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(b => String(b.status).toUpperCase() === 'COMPLETED').length;
    const pendingBookings = bookings.filter(b => !['COMPLETED', 'REJECTED', 'CANCELLED'].includes(String(b.status).toUpperCase())).length;
    const totalAmountPaid = bookings
      .filter(b => ['SUCCESS', 'PAID'].includes(String(b.paymentStatus || '').toUpperCase()) || String(b.status).toUpperCase() === 'COMPLETED')
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0)
      || allPayments.filter(p => p.status === 'SUCCESS').reduce((sum, p) => sum + (p.amount || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        user,
        stats: {
          totalBookings,
          completedBookings,
          pendingBookings,
          totalAmountPaid,
          totalConsultations: consultations.length
        },
        bookings,
        payments: allPayments,
        cart: cart || { items: [] },
        consultations
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch detailed user profile',
      error: error.message,
    });
  }
};

export const getAdminBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { default: Booking } = await import('../models/Booking');

    // Auto-heal any bookings whose payment was verified or are already active in testing
    await Booking.updateMany(
      { 
        status: { $in: [BookingStatus.APPROVED, BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED] },
        paymentStatus: { $ne: PaymentStatus.SUCCESS }
      },
      { paymentStatus: PaymentStatus.SUCCESS }
    ).catch(() => {});

    const { status, paymentStatus, search, startDate, endDate, page, limit } = req.query;

    const filter: any = {};

    if (status && status !== 'all') {
      const normalizedStatus = String(status).trim().toUpperCase().replace(/\s+/g, '_');
      if (normalizedStatus in BookingStatus || Object.values(BookingStatus).includes(normalizedStatus as BookingStatus)) {
        filter.status = normalizedStatus;
      }
    }

    if (paymentStatus && paymentStatus !== 'all') {
      const normalizedPay = String(paymentStatus).trim().toUpperCase().replace(/\s+/g, '_');
      if (normalizedPay === 'PAID') {
        filter.paymentStatus = { $in: [PaymentStatus.SUCCESS, 'PAID'] };
      } else if (normalizedPay in PaymentStatus || Object.values(PaymentStatus).includes(normalizedPay as PaymentStatus)) {
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
      
      const { default: User } = await import('../models/User');
      const matchingUsers = await User.find({
        $or: [
          { firstName: { $regex: escaped, $options: 'i' } },
          { lastName: { $regex: escaped, $options: 'i' } },
          { email: { $regex: escaped, $options: 'i' } },
          { phone: { $regex: escaped, $options: 'i' } },
        ]
      }).select('_id');

      const userIds = matchingUsers.map(u => u._id);

      const orConditions: any[] = [
        { userId: { $in: userIds } },
        { invoiceNumber: { $regex: escaped, $options: 'i' } },
        { 'items.samples.productName': { $regex: escaped, $options: 'i' } }
      ];

      const cleanHex = q.replace(/^BKG-/i, '').trim();
      if (cleanHex.length === 24 && /^[0-9a-fA-F]{24}$/.test(cleanHex)) {
        const { default: mongoose } = await import('mongoose');
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: error.message,
    });
  }
};

// -----------------------------------------
// NEW: Booking Assignment & Rejection & Status
// -----------------------------------------

export const updateAdminBookingStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { default: Booking } = await import('../models/Booking');
    const { id } = req.params;
    const { status, paymentStatus, labId } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    if (status && Object.values(BookingStatus).includes(status as BookingStatus)) {
      booking.status = status as BookingStatus;
    }
    if (paymentStatus && Object.values(PaymentStatus).includes(paymentStatus as PaymentStatus)) {
      booking.paymentStatus = paymentStatus as PaymentStatus;
    }
    if (labId !== undefined) {
      if (!booking.metadata) booking.metadata = {};
      if (labId === 'litmus_direct') {
        booking.labId = undefined as any;
        booking.metadata.isLitmusDirect = true;
      } else if (labId === 'smart_allocation' || labId === '') {
        booking.labId = undefined as any;
        booking.metadata.isLitmusDirect = false;
      } else {
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update booking status',
      error: error.message,
    });
  }
};

export const assignLabToBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { default: Booking } = await import('../models/Booking');
    const { labId } = req.body;
    const { id } = req.params;

    const isLitmusDirect = !labId || labId === 'litmus_direct' || labId === 'litmus' || labId === 'litmus_internal';
    const updatedLabId = isLitmusDirect ? undefined : labId;

    const booking = await Booking.findByIdAndUpdate(
      id,
      { 
        labId: updatedLabId, 
        status: BookingStatus.IN_PROGRESS 
      },
      { new: true }
    );
    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Lab assigned successfully',
      data: booking,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to assign lab',
      error: error.message,
    });
  }
};

export const rejectBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    import('../models/Booking').then(async ({ default: Booking }) => {
      const { reason } = req.body;
      const { id } = req.params;

      if (!reason) {
        res.status(400).json({ success: false, message: 'Rejection reason is required' });
        return;
      }

      const booking = await Booking.findByIdAndUpdate(
        id,
        { 
          status: 'REJECTED',
          $set: { 'metadata.rejectionReason': reason }
        },
        { new: true }
      );

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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to reject booking',
      error: error.message,
    });
  }
};

export const approveBookingResult = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reportUrl, reportFiles, summary, recommendations, tips, additionalNotes, reportSummary } = req.body || {};

    import('../models/Booking').then(async ({ default: Booking }) => {
      import('../types').then(async ({ BookingStatus }) => {
        const { sendTestReportReadyEmail } = await import('../utils/mailer');
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
        } else if (reportUrl && (!booking.reportFiles || !booking.reportFiles.includes(reportUrl))) {
          if (!booking.reportFiles) booking.reportFiles = [];
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
            const user = booking.userId as any;
            if (user.email) {
              const customerName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
              await sendTestReportReadyEmail(user.email, {
                customerName,
                bookingId: booking._id.toString(),
              });
            }
          } catch (e) {
            console.error('Failed to send report ready email:', e);
          }
        }

        res.status(200).json({
          success: true,
          message: 'Booking result approved by admin',
          data: booking,
        });
      });
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to approve booking result',
      error: error.message,
    });
  }
};

export const updateBookingReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reportUrl, reportFiles, summary, recommendations, tips, additionalNotes, reportSummary, isReportApprovedByAdmin } = req.body;

    import('../models/Booking').then(async ({ default: Booking }) => {
      import('../types').then(async ({ BookingStatus }) => {
        const { sendTestReportReadyEmail } = await import('../utils/mailer');
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
        } else if (reportUrl) {
          if (!booking.reportFiles) booking.reportFiles = [];
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
            const user = booking.userId as any;
            if (user.email) {
              const customerName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
              await sendTestReportReadyEmail(user.email, {
                customerName,
                bookingId: booking._id.toString(),
              });
            }
          } catch (e) {
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update report',
      error: error.message,
    });
  }
};

export const rejectBookingResult = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reason } = req.body;
    import('../models/Booking').then(async ({ default: Booking }) => {
      import('../types').then(async ({ BookingStatus }) => {
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
        if (!booking.metadata) booking.metadata = {};
        booking.metadata.rejectionReason = reason;

        await booking.save();

        res.status(200).json({
          success: true,
          message: 'Booking result rejected and sent back to lab',
          data: booking,
        });
      });
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to reject booking result',
      error: error.message,
    });
  }
};

export const getAdminStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { default: User } = await import('../models/User');
    const { default: Laboratory } = await import('../models/Laboratory');
    const { default: Booking } = await import('../models/Booking');
    const { default: Payment } = await import('../models/Payment');
    const { Consultation } = await import('../models/Consultation');
    const { default: Test } = await import('../models/Test');
    const { default: Package } = await import('../models/Package');
    const { default: Category } = await import('../models/Category');
    const { default: Review } = await import('../models/Review');
    const { UserRole, BookingStatus, PaymentStatus, ApprovalStatus } = await import('../types');

    const [
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
      pendingTests,
      pendingPackages,
      pendingReports,
      totalReports,
      totalCategories,
      totalTests,
      totalPackages,
      totalReviews,
      successfulPayments,
    ] = await Promise.all([
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

    const totalRevenue = (successfulPayments as any[]).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin stats',
      error: error.message,
    });
  }
};

export const getAdminPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    import('../models/Payment').then(async ({ default: Payment }) => {
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin payments',
      error: error.message,
    });
  }
};

export const getAdminAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { default: Booking } = await import('../models/Booking');
    const { default: Laboratory } = await import('../models/Laboratory');
    const { default: User } = await import('../models/User');

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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message,
    });
  }
};

export const updateCollectionDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, collectorName, collectorContact, notifyDelay, courierDetails, trackingId, courierName, notes, collectionMethod } = req.body;
    const { id } = req.params;

    const { default: Booking } = await import('../models/Booking');
    const { sendSampleCollectedEmail, sendCollectionDelayedEmail } = await import('../utils/mailer');

    const booking = await Booking.findById(id);
    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    if (status) booking.collectionStatus = status;
    if (collectionMethod) booking.collectionMethod = collectionMethod;

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

      if (!booking.metadata) booking.metadata = {};
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
          const user = booking.userId as any;
          const customerName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
          if (user.email) {
            await sendSampleCollectedEmail(user.email, {
              customerName,
              bookingId: booking._id.toString(),
            });
          }
        } catch (e) {
          console.error('Failed to send sample collected email:', e);
        }
      }

      if (notifyDelay && booking && booking.userId) {
        try {
          const user = booking.userId as any;
          const customerName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
          if (user.email) {
            await sendCollectionDelayedEmail(user.email, {
              customerName,
              bookingId: booking._id.toString(),
            });
          }
        } catch (e) {
          console.error('Failed to send collection delayed email:', e);
        }
      }

    res.status(200).json({
      success: true,
      message: 'Collection details updated successfully',
      data: booking,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update collection details',
      error: error.message,
    });
  }
};

// -----------------------------------------
// NEW: Test & Package Approvals
// -----------------------------------------

export const getPendingApprovals = async (req: Request, res: Response): Promise<void> => {
  try {
    const { default: Test } = await import('../models/Test');
    const { default: Package } = await import('../models/Package');
    const { ApprovalStatus } = await import('../types');

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
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch pending approvals', error: error.message });
  }
};

export const approveTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { default: Test } = await import('../models/Test');
    const { ApprovalStatus } = await import('../types');

    const test = await Test.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: ApprovalStatus.APPROVED, $unset: { rejectionReason: 1 } },
      { new: true }
    );

    if (!test) { res.status(404).json({ success: false, message: 'Test not found' }); return; }

    res.status(200).json({ success: true, message: 'Test approved successfully', data: test });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to approve test', error: error.message });
  }
};

export const rejectTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { default: Test } = await import('../models/Test');
    const { ApprovalStatus } = await import('../types');
    const { reason } = req.body;

    if (!reason) { res.status(400).json({ success: false, message: 'Rejection reason is required' }); return; }

    const test = await Test.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: ApprovalStatus.REJECTED, rejectionReason: reason },
      { new: true }
    );

    if (!test) { res.status(404).json({ success: false, message: 'Test not found' }); return; }

    res.status(200).json({ success: true, message: 'Test rejected successfully', data: test });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to reject test', error: error.message });
  }
};

export const approvePackage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { default: Package } = await import('../models/Package');
    const { ApprovalStatus } = await import('../types');

    const pkg = await Package.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: ApprovalStatus.APPROVED, $unset: { rejectionReason: 1 } },
      { new: true }
    );

    if (!pkg) { res.status(404).json({ success: false, message: 'Package not found' }); return; }

    res.status(200).json({ success: true, message: 'Package approved successfully', data: pkg });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to approve package', error: error.message });
  }
};

export const rejectPackage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { default: Package } = await import('../models/Package');
    const { ApprovalStatus } = await import('../types');
    const { reason } = req.body;

    if (!reason) { res.status(400).json({ success: false, message: 'Rejection reason is required' }); return; }

    const pkg = await Package.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: ApprovalStatus.REJECTED, rejectionReason: reason },
      { new: true }
    );

    if (!pkg) { res.status(404).json({ success: false, message: 'Package not found' }); return; }

    res.status(200).json({ success: true, message: 'Package rejected successfully', data: pkg });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to reject package', error: error.message });
  }
};
