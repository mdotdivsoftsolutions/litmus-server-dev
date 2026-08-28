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

    const bookings = await Booking.find({ labId: lab._id })
      .populate('userId', 'firstName lastName email phone')
      .populate('items.testId', 'testName price')
      .populate('items.packageId', 'name price')
      .sort('-createdAt');

    const totalBookings = bookings.length;
    const newBookings = bookings.filter(b => b.status === BookingStatus.PENDING || b.status === BookingStatus.APPROVED).length;
    const inProgressTests = bookings.filter(b => b.status === BookingStatus.IN_PROGRESS).length;
    const completedTests = bookings.filter(b => b.status === BookingStatus.COMPLETED).length;

    // Completed today
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const completedToday = bookings.filter(b => {
      if (b.status !== BookingStatus.COMPLETED) return false;
      const dateToCheck = b.metadata?.completedAt ? new Date(b.metadata.completedAt) : new Date(b.updatedAt || b.createdAt);
      return dateToCheck >= startOfToday;
    }).length;

    // Total earnings & revenue this month
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let totalRevenue = 0;
    let revenueThisMonth = 0;

    for (const b of bookings) {
      const isPaid = (b.paymentStatus || '').toUpperCase() === 'SUCCESS' || (b.paymentStatus || '').toUpperCase() === 'PAID' || b.status === BookingStatus.COMPLETED;
      const amount = b.totalAmount || (b.items || []).reduce((sum: number, item: any) => sum + (item.price || 0), 0) || 0;
      if (isPaid) {
        totalRevenue += amount;
        const bDate = new Date(b.createdAt);
        if (bDate >= startOfThisMonth) {
          revenueThisMonth += amount;
        }
      }
    }

    // Associated Tests, Packages, Employees
    const totalTests = await Test.countDocuments({
      $or: [
        { _id: { $in: lab.tests || [] } },
        { labId: lab._id }
      ]
    });

    const totalPackages = await Package.countDocuments({
      $or: [
        { labId: lab._id },
        { _id: { $in: lab.packages || [] } }
      ]
    });

    const totalEmployees = await User.countDocuments({
      labId: lab._id,
      role: { $in: [UserRole.LAB, UserRole.LAB_EMPLOYEE] }
    });

    // Schedule / Upcoming active jobs
    const activeSchedule = bookings.filter(b => [BookingStatus.PENDING, BookingStatus.APPROVED, BookingStatus.IN_PROGRESS].includes(b.status as any)).length;

    // Recent bookings formatted
    const recentBookings = bookings.slice(0, 6).map(b => {
      const userObj = b.userId as any;
      const userName = `${userObj?.firstName || ''} ${userObj?.lastName || ''}`.trim() || b.collectionDetails?.name || 'Customer';
      const productNames = b.items?.map((i: any) => i.samples?.[0]?.productName || i.packageId?.name || i.testId?.testName || i.testId?.name).filter(Boolean);
      const product = productNames?.length > 0 ? productNames.join(', ') : 'Diagnostic Order';
      const testsCount = b.items?.reduce((count: number, i: any) => count + (i.samples?.reduce((sc: number, s: any) => sc + (s.selectedParameters?.length || 1), 0) || 1), 0) || 0;

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

    // Pending uploads
    const pendingUploads = bookings
      .filter(b => {
        const hasReport = Boolean(b.reportFiles?.length || b.reportUrl || b.metadata?.reportUrl);
        return !hasReport && [BookingStatus.APPROVED, BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED].includes(b.status as any);
      })
      .slice(0, 5)
      .map(b => {
        const userObj = b.userId as any;
        const userName = `${userObj?.firstName || ''} ${userObj?.lastName || ''}`.trim() || b.collectionDetails?.name || 'Customer';
        const productNames = b.items?.map((i: any) => i.samples?.[0]?.productName || i.packageId?.name || i.testId?.testName || i.testId?.name).filter(Boolean);
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

    // Weekly Load
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyLoad: { day: string; date: string; bookings: number }[] = [];
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

    const { sendSampleCollectedEmail, sendCollectionDelayedEmail } = await import('../utils/mailer');
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
    test.approvalStatus = ApprovalStatus.PENDING;
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
    pkg.approvalStatus = ApprovalStatus.PENDING;
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
