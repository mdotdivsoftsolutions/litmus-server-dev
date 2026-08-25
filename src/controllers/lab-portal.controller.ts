import { Request, Response } from 'express';
import Laboratory from '../models/Laboratory';
import Booking from '../models/Booking';
import { BookingStatus, ApprovalStatus, UserRole } from '../types';
import User from '../models/User';
import Test from '../models/Test';
import Package from '../models/Package';

export const getLabForRequest = async (req: Request) => {
  const userLabId = req.user?.labId;
  const userId = req.user?.id;
  if (userLabId) {
    const lab = await Laboratory.findById(userLabId);
    if (lab) return lab;
  }
  if (userId) {
    let lab = await Laboratory.findOne({ userId });
    if (lab) return lab;
    const user = await User.findById(userId);
    if (user?.email) {
      lab = await Laboratory.findOne({ contactEmail: user.email.toLowerCase().trim() });
      if (lab) {
        if (!lab.userId && user.role === UserRole.LAB) {
          lab.userId = user._id as any;
          await lab.save();
        }
        if (!user.labId) {
          user.labId = lab._id as any;
          await user.save();
        }
        return lab;
      }
    }
  }
  return null;
};

export const getLabDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const lab = await getLabForRequest(req);

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
    const lab = await getLabForRequest(req);

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
    const { id } = req.params;
    const { status } = req.body;

    const lab = await getLabForRequest(req);
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
    if (!booking.metadata) booking.metadata = {};
    if (status === BookingStatus.IN_PROGRESS && !booking.metadata.testingStartedAt) {
      booking.metadata.testingStartedAt = new Date();
    }
    if (status === BookingStatus.COMPLETED && !booking.metadata.completedAt) {
      booking.metadata.completedAt = new Date();
    }
    booking.markModified('metadata');
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
    const lab = await getLabForRequest(req);

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
    const lab = await getLabForRequest(req);

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
    const lab = await getLabForRequest(req);

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

      if (!booking.metadata) booking.metadata = {};

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
    const lab = await getLabForRequest(req);
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
    const lab = await getLabForRequest(req);
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
    const lab = await getLabForRequest(req);
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
    const lab = await getLabForRequest(req);
    
    if (!lab) {
      res.status(404).json({ success: false, message: 'Laboratory not found' });
      return;
    }

    const packages = await Package.find({
      $or: [
        { createdBy: userId },
        { labId: lab._id },
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
    const lab = await getLabForRequest(req);
    const packageData = {
      ...req.body,
      createdBy: userId,
      labId: lab?._id,
      approvalStatus: ApprovalStatus.PENDING
    };
    const newPackage = await Package.create(packageData);
    if (lab) {
      if (!lab.packages) lab.packages = [];
      lab.packages.push(newPackage._id as any);
      await lab.save();
    }
    res.status(201).json({ success: true, data: newPackage });
  } catch (error: any) {
    res.status(400).json({ success: false, message: 'Failed to create package', error: error.message });
  }
};

export const updateMyLabPackage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const lab = await getLabForRequest(req);
    const pkg = await Package.findOne({
      _id: req.params.id,
      $or: [
        { createdBy: userId },
        ...(lab ? [{ labId: lab._id }] : [])
      ]
    });
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
    const lab = await getLabForRequest(req);
    
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
    const lab = await getLabForRequest(req);
    
    if (!lab) {
      res.status(404).json({ success: false, message: 'Laboratory not found' });
      return;
    }

    const adminUsers = await User.find({ role: UserRole.ADMIN });
    const adminUserIds = adminUsers.map(u => u._id);
    const adminUserIdStrings = adminUsers.map(u => u._id.toString());
    
    const query: any = {
      _id: { $nin: lab.packages || [] },
      $or: [
        { approvalStatus: ApprovalStatus.APPROVED },
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
    } else {
      query.$or = [
        ...(query.$or || []),
        { labId: { $exists: false } },
        { labId: null }
      ];
    }

    const packages = await Package.find(query).populate('tests', 'testName price offerPrice').sort('-createdAt');
    res.status(200).json({ success: true, data: packages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch platform packages', error: error.message });
  }
};

export const addExistingTestToLab = async (req: Request, res: Response): Promise<void> => {
  try {
    const { testId } = req.body;
    
    if (!testId) { res.status(400).json({ success: false, message: 'testId is required' }); return; }

    const lab = await getLabForRequest(req);
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
    
    if (!packageId) { res.status(400).json({ success: false, message: 'packageId is required' }); return; }

    const lab = await getLabForRequest(req);
    
    if (!lab) {
      res.status(404).json({ success: false, message: 'Laboratory not found' });
      return;
    }

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
