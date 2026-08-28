import { Request, Response } from 'express';

export const getAdminStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { default: User } = await import('../../models/User');
    const { default: Laboratory } = await import('../../models/Laboratory');
    const { default: Booking } = await import('../../models/Booking');
    const { default: Payment } = await import('../../models/Payment');
    const { Consultation } = await import('../../models/Consultation');
    const { default: Test } = await import('../../models/Test');
    const { default: Package } = await import('../../models/Package');
    const { default: Category } = await import('../../models/Category');
    const { default: Review } = await import('../../models/Review');
    const { UserRole, BookingStatus, PaymentStatus, ApprovalStatus } = await import('../../types');

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
    const pendingApprovals = (Number(pendingTests) || 0) + (Number(pendingPackages) || 0) + (Number(pendingReports) || 0);

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
    const { default: Payment } = await import('../../models/Payment');
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
    const { default: Booking } = await import('../../models/Booking');
    const { default: User } = await import('../../models/User');

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
          _id: "$items.packageId",
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
