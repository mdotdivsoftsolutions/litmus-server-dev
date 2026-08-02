import { Request, Response } from 'express';
import User from '../models/User';
import { UserRole } from '../types';

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find({ role: UserRole.USER });
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

    // Get bookings
    const bookings = await Booking.find({ userId })
      .populate('labId', 'labName location')
      .populate('items.testId', 'name testName metadata')
      .populate('items.packageId', 'name')
      .sort('-createdAt');

    // Get payments
    const payments = await Payment.find({ bookingId: { $in: bookings.map(b => b._id) } })
      .sort('-createdAt');

    // Get abandoned cart
    const cart = await Cart.findOne({ userId })
      .populate('items.testId', 'name testName')
      .populate('items.packageId', 'name');

    // Calculate stats
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(b => b.status === 'COMPLETED').length;
    const pendingBookings = bookings.filter(b => b.status !== 'COMPLETED' && b.status !== 'REJECTED').length;
    const totalAmountPaid = payments
      .filter(p => p.status === 'SUCCESS')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        user,
        stats: {
          totalBookings,
          completedBookings,
          pendingBookings,
          totalAmountPaid
        },
        bookings,
        payments,
        cart: cart || { items: [] }
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
    import('../models/Booking').then(async ({ default: Booking }) => {
      const bookings = await Booking.find()
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
        
      res.status(200).json({
        success: true,
        count: bookings.length,
        data: bookings,
      });
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
// NEW: Booking Assignment & Rejection
// -----------------------------------------

export const assignLabToBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    import('../models/Booking').then(async ({ default: Booking }) => {
      const { labId } = req.body;
      const { id } = req.params;

      if (!labId) {
        res.status(400).json({ success: false, message: 'Lab ID is required' });
        return;
      }

      const booking = await Booking.findByIdAndUpdate(
        id,
        { 
          labId, 
          status: 'IN_PROGRESS' 
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
    const totalUsers = await User.countDocuments();
    
    let totalLabs = 0;
    let totalBookings = 0;
    let totalRevenue = 0;

    await import('../models/Laboratory').then(async ({ default: Laboratory }) => {
      totalLabs = await Laboratory.countDocuments();
    });

    await import('../models/Booking').then(async ({ default: Booking }) => {
      totalBookings = await Booking.countDocuments();
    });

    await import('../models/Payment').then(async ({ default: Payment }) => {
      import('../types').then(async ({ PaymentStatus }) => {
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
    const { status, collectorName, collectorContact, notifyDelay } = req.body;
    const { id } = req.params;

    import('../models/Booking').then(async ({ default: Booking }) => {
      const { sendSampleCollectedEmail, sendCollectionDelayedEmail } = await import('../utils/mailer');
      const updateData: any = {};
      if (status) updateData.collectionStatus = status;
      if (collectorName !== undefined || collectorContact !== undefined) {
        updateData.assignedCollector = {
          name: collectorName,
          contact: collectorContact
        };
      }

      const booking = await Booking.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true }
      ).populate('userId', 'firstName lastName email');

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

      if (!booking) {
        res.status(404).json({ success: false, message: 'Booking not found' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Collection details updated successfully',
        data: booking,
      });
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
