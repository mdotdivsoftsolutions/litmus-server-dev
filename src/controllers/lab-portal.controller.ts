import { Request, Response } from 'express';
import Laboratory from '../models/Laboratory';
import Booking from '../models/Booking';
import { BookingStatus, ApprovalStatus, UserRole } from '../types';
import User from '../models/User';
import Test from '../models/Test';
import Package from '../models/Package';

export const getLabDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const lab = await Laboratory.findOne({ userId });

    if (!lab) {
      res.status(404).json({ success: false, message: 'Laboratory not found for this user' });
      return;
    }

    const bookings = await Booking.find({ labId: lab._id });
    const pendingTests = bookings.filter(b => b.status === BookingStatus.IN_PROGRESS || b.status === BookingStatus.PENDING).length;
    const completedTests = bookings.filter(b => b.status === BookingStatus.COMPLETED).length;
    
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch lab stats', error: error.message });
  }
};

export const getMyLabBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const lab = await Laboratory.findOne({ userId });

    if (!lab) {
      res.status(404).json({ success: false, message: 'Laboratory not found for this user' });
      return;
    }

    const bookings = await Booking.find({ labId: lab._id })
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch lab bookings', error: error.message });
  }
};

export const updateBookingStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { status } = req.body;

    const lab = await Laboratory.findOne({ userId });
    if (!lab) {
      res.status(404).json({ success: false, message: 'Laboratory not found for this user' });
      return;
    }

    const booking = await Booking.findOne({ _id: id, labId: lab._id });
    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found or not assigned to this lab' });
      return;
    }

    if (!Object.values(BookingStatus).includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid booking status' });
      return;
    }

    booking.status = status;
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking status updated successfully',
      data: booking,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update booking status', error: error.message });
  }
};

export const getMyLabProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const lab = await Laboratory.findOne({ userId });

    if (!lab) {
      res.status(404).json({ success: false, message: 'Laboratory not found for this user' });
      return;
    }

    res.status(200).json({
      success: true,
      data: lab,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch lab profile', error: error.message });
  }
};

export const updateMyLabProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const lab = await Laboratory.findOne({ userId });

    if (!lab) {
      res.status(404).json({ success: false, message: 'Laboratory not found for this user' });
      return;
    }

    const updatedLab = await Laboratory.findByIdAndUpdate(
      lab._id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Laboratory profile updated successfully',
      data: updatedLab,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: 'Failed to update lab profile', error: error.message });
  }
};

export const updateCollectionDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, collectorName, collectorContact, notifyDelay } = req.body;
    const { id } = req.params;
    const userId = req.user?.id;
    const lab = await Laboratory.findOne({ userId });

    if (!lab) {
      res.status(404).json({ success: false, message: 'Laboratory not found for this user' });
      return;
    }

    import('../models/Booking').then(async ({ default: Booking }) => {
      const { sendSampleCollectedEmail, sendCollectionDelayedEmail } = await import('../utils/mailer');
      // Find the booking and make sure it belongs to this lab
      const booking = await Booking.findOne({ _id: id, labId: lab._id });

      if (!booking) {
        res.status(404).json({ success: false, message: 'Booking not found or not assigned to this lab' });
        return;
      }

      if (status) booking.collectionStatus = status;
      if (collectorName !== undefined || collectorContact !== undefined) {
        booking.assignedCollector = {
          name: collectorName,
          contact: collectorContact
        };
      }

      await booking.save();
      await booking.populate('userId', 'firstName lastName email');

      if (status === 'COLLECTED' && booking.userId) {
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

      if (notifyDelay && booking.userId) {
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
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update collection details',
      error: error.message,
    });
  }
};

export const getMyLabTests = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const lab = await Laboratory.findOne({ userId });
    if (!lab) { res.status(404).json({ success: false, message: 'Laboratory not found' }); return; }

    const tests = await Test.find({
      $or: [
        { _id: { $in: lab.tests } },
        { labId: lab._id }
      ]
    }).sort('-createdAt');
    res.status(200).json({ success: true, data: tests });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch tests', error: error.message });
  }
};

export const createMyLabTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const lab = await Laboratory.findOne({ userId });
    if (!lab) { res.status(404).json({ success: false, message: 'Laboratory not found' }); return; }

    const testData = {
      ...req.body,
      labId: lab._id,
      creatorType: 'LAB',
      approvalStatus: ApprovalStatus.PENDING
    };
    const test = await Test.create(testData);
    
    // Auto-associate test with lab
    lab.tests.push(test._id);
    await lab.save();

    res.status(201).json({ success: true, data: test });
  } catch (error: any) {
    res.status(400).json({ success: false, message: 'Failed to create test', error: error.message });
  }
};

export const updateMyLabTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const lab = await Laboratory.findOne({ userId });
    if (!lab) { res.status(404).json({ success: false, message: 'Laboratory not found' }); return; }

    const test = await Test.findOne({ _id: req.params.id, labId: lab._id });
    if (!test) { res.status(404).json({ success: false, message: 'Test not found' }); return; }

    Object.assign(test, req.body);
    test.approvalStatus = ApprovalStatus.PENDING; // Require re-approval on edit
    await test.save();

    res.status(200).json({ success: true, data: test });
  } catch (error: any) {
    res.status(400).json({ success: false, message: 'Failed to update test', error: error.message });
  }
};

export const getMyLabPackages = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const lab = await Laboratory.findOne({ userId });
    
    if (!lab) {
      res.status(404).json({ success: false, message: 'Laboratory not found' });
      return;
    }

    const packages = await Package.find({
      $or: [
        { createdBy: userId },
        { _id: { $in: lab.packages || [] } }
      ]
    }).sort('-createdAt');
    
    res.status(200).json({ success: true, data: packages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch packages', error: error.message });
  }
};

export const createMyLabPackage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const packageData = {
      ...req.body,
      createdBy: userId,
      approvalStatus: ApprovalStatus.PENDING
    };
    const newPackage = await Package.create(packageData);
    res.status(201).json({ success: true, data: newPackage });
  } catch (error: any) {
    res.status(400).json({ success: false, message: 'Failed to create package', error: error.message });
  }
};

export const updateMyLabPackage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const pkg = await Package.findOne({ _id: req.params.id, createdBy: userId });
    if (!pkg) { res.status(404).json({ success: false, message: 'Package not found' }); return; }

    Object.assign(pkg, req.body);
    pkg.approvalStatus = ApprovalStatus.PENDING; // Require re-approval
    await pkg.save();

    res.status(200).json({ success: true, data: pkg });
  } catch (error: any) {
    res.status(400).json({ success: false, message: 'Failed to update package', error: error.message });
  }
};

export const getPlatformTests = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const lab = await Laboratory.findOne({ userId });
    
    if (!lab) {
      res.status(404).json({ success: false, message: 'Laboratory not found' });
      return;
    }

    const tests = await Test.find({ 
      creatorType: 'ADMIN',
      _id: { $nin: lab.tests },
      $or: [
        { approvalStatus: ApprovalStatus.APPROVED },
        { approvalStatus: { $exists: false } }
      ]
    }).sort('-createdAt');
    res.status(200).json({ success: true, data: tests });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch platform tests', error: error.message });
  }
};

export const getPlatformPackages = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const lab = await Laboratory.findOne({ userId });
    
    if (!lab) {
      res.status(404).json({ success: false, message: 'Laboratory not found' });
      return;
    }

    const adminUsers = await User.find({ role: UserRole.ADMIN });
    const adminUserIds = adminUsers.map(u => u._id);
    const adminUserIdStrings = adminUsers.map(u => u._id.toString());
    
    if (adminUserIds.length === 0) {
      res.status(404).json({ success: false, message: 'Admin user not found' });
      return;
    }

    const packages = await Package.find({
      createdBy: { $in: [...adminUserIds, ...adminUserIdStrings] },
      _id: { $nin: lab.packages || [] },
      $or: [
        { approvalStatus: ApprovalStatus.APPROVED },
        { approvalStatus: { $exists: false } }
      ]
    }).populate('tests', 'testName price offerPrice').sort('-createdAt');
    res.status(200).json({ success: true, data: packages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch platform packages', error: error.message });
  }
};

export const addExistingTestToLab = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { testId } = req.body;
    
    if (!testId) { res.status(400).json({ success: false, message: 'testId is required' }); return; }

    const lab = await Laboratory.findOne({ userId });
    if (!lab) { res.status(404).json({ success: false, message: 'Laboratory not found' }); return; }

    const test = await Test.findById(testId);
    if (!test || test.creatorType !== 'ADMIN') { res.status(404).json({ success: false, message: 'Platform test not found' }); return; }

    if (!lab.tests.includes(testId as any)) {
      lab.tests.push(testId as any);
      await lab.save();
    }

    res.status(200).json({ success: true, message: 'Test added successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to add test', error: error.message });
  }
};

export const addExistingPackageToLab = async (req: Request, res: Response): Promise<void> => {
  try {
    const { packageId } = req.body;
    const userId = req.user?.id;
    
    if (!packageId) { res.status(400).json({ success: false, message: 'packageId is required' }); return; }

    const lab = await Laboratory.findOne({ userId });
    
    if (!lab) {
      res.status(404).json({ success: false, message: 'Laboratory not found' });
      return;
    }

    // Initialize packages array if it doesn't exist
    if (!lab.packages) {
      lab.packages = [];
    }

    if (!lab.packages.includes(packageId as any)) {
      lab.packages.push(packageId as any);
      await lab.save();
    }

    res.status(200).json({ success: true, message: 'Package added to laboratory successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to add package', error: error.message });
  }
};
