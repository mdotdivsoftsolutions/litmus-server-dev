import { Request, Response } from 'express';
import { BookingStatus, PaymentStatus } from '../../types';

export const getAdminBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { default: Booking } = await import('../../models/Booking');

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
      
      const { default: User } = await import('../../models/User');
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

export const updateAdminBookingStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { default: Booking } = await import('../../models/Booking');
    const { id } = req.params;
    const { status, paymentStatus, labId } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    if (!booking.metadata) booking.metadata = {};

    if (status && Object.values(BookingStatus).includes(status as BookingStatus)) {
      booking.status = status as BookingStatus;
      if (status === BookingStatus.APPROVED && !booking.metadata.adminApprovedAt) {
        booking.metadata.adminApprovedAt = new Date();
      }
      if (status === BookingStatus.IN_PROGRESS && !booking.metadata.testingStartedAt) {
        booking.metadata.testingStartedAt = new Date();
      }
      if (status === BookingStatus.COMPLETED) {
        if (!booking.metadata.completedAt) booking.metadata.completedAt = new Date();
        if (!booking.metadata.testingStartedAt) booking.metadata.testingStartedAt = booking.metadata.completedAt;
      }
    }
    if (paymentStatus && Object.values(PaymentStatus).includes(paymentStatus as PaymentStatus)) {
      booking.paymentStatus = paymentStatus as PaymentStatus;
      if (paymentStatus === PaymentStatus.SUCCESS && !booking.metadata.paymentConfirmedAt) {
        booking.metadata.paymentConfirmedAt = new Date();
      }
    }
    if (labId !== undefined) {
      if (labId === 'litmus_direct') {
        booking.labId = undefined as any;
        booking.metadata.isLitmusDirect = true;
        if (!booking.metadata.labAssignedAt) booking.metadata.labAssignedAt = new Date();
      } else if (labId === 'smart_allocation' || labId === '') {
        booking.labId = undefined as any;
        booking.metadata.isLitmusDirect = false;
      } else {
        booking.labId = labId;
        booking.metadata.isLitmusDirect = false;
        booking.metadata.labAssignedAt = new Date();
      }
    }
    booking.markModified('metadata');

    await booking.save();

    if (booking.paymentStatus === PaymentStatus.SUCCESS || booking.status === BookingStatus.APPROVED) {
      const { default: NotificationService } = await import('../../services/notification.service');
      NotificationService.notifyConfirmedBookingById(booking._id.toString()).catch(() => {});
    }

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
    const { default: Booking } = await import('../../models/Booking');
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
    const { default: Booking } = await import('../../models/Booking');
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

    const { default: Booking } = await import('../../models/Booking');
    const { BookingStatus } = await import('../../types');
    const booking = await Booking.findById(req.params.id).populate('userId', 'firstName lastName email phone');
    
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
        const customerName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Valued Customer';
        const { default: NotificationService } = await import('../../services/notification.service');
        await NotificationService.notifyDeliveryUpdate({
          customerEmail: user.email,
          customerPhone: user.phone,
          customerName,
          bookingId: booking._id.toString(),
        });
      } catch (e) {
        console.error('Failed to send report ready notification:', e);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Booking result approved by admin',
      data: booking,
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

    const { default: Booking } = await import('../../models/Booking');
    const { BookingStatus } = await import('../../types');
    const { sendTestReportReadyEmail } = await import('../../utils/mailer');
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

    if (!booking.metadata) booking.metadata = {};
    if (booking.reportFiles?.length || mergedSummary) {
      if (!booking.metadata.reportUploadedAt) booking.metadata.reportUploadedAt = new Date();
    }

    const wasApproved = booking.isReportApprovedByAdmin;
    if (isReportApprovedByAdmin !== undefined) {
      booking.isReportApprovedByAdmin = Boolean(isReportApprovedByAdmin);
      if (booking.isReportApprovedByAdmin) {
        booking.status = BookingStatus.COMPLETED;
        if (!booking.metadata.completedAt) booking.metadata.completedAt = new Date();
        if (!booking.metadata.reportUploadedAt) booking.metadata.reportUploadedAt = booking.metadata.completedAt;
      }
    }
    booking.markModified('metadata');

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
    const { default: Booking } = await import('../../models/Booking');
    const { BookingStatus } = await import('../../types');
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
    
    if (!booking.metadata) booking.metadata = {};
    booking.metadata.rejectionReason = reason;

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking result rejected and sent back to lab',
      data: booking,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to reject booking result',
      error: error.message,
    });
  }
};

export const updateCollectionDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, collectorName, collectorContact, notifyDelay, courierDetails, trackingId, courierName, notes, collectionMethod } = req.body;
    const { id } = req.params;

    const { default: Booking } = await import('../../models/Booking');
    const { sendSampleCollectedEmail, sendCollectionDelayedEmail } = await import('../../utils/mailer');

    const booking = await Booking.findById(id);
    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
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
    if (collectionMethod) booking.collectionMethod = collectionMethod;

    if (collectorName !== undefined || collectorContact !== undefined) {
      booking.assignedCollector = {
        name: collectorName || '',
        contact: collectorContact || ''
      };
      if (collectorName && !booking.metadata.collectorAssignedAt) {
        booking.metadata.collectorAssignedAt = new Date();
      }
    }

    const newTrackingId = courierDetails?.trackingId || trackingId;
    if (newTrackingId !== undefined) {
      const cName = courierDetails?.courierName || courierName || '';
      const cNotes = courierDetails?.notes || notes || '';

      if (!Array.isArray(booking.metadata.trackingHistory)) {
        booking.metadata.trackingHistory = [];
      }

      if (!booking.metadata.collectorAssignedAt) {
        booking.metadata.collectorAssignedAt = new Date();
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
