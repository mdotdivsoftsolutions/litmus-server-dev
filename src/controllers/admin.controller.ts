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

export const getAdminBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    import('../models/Booking').then(async ({ default: Booking }) => {
      const bookings = await Booking.find()
        .populate('userId', 'firstName lastName email phone')
        .populate('labId', 'labName location')
        .populate('productId', 'name')
        .populate('selectedTests', 'testName price')
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

export const approveBookingResult = async (req: Request, res: Response): Promise<void> => {
  try {
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
