import { Request, Response } from 'express';
import path from 'path';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import Booking from '../models/Booking';
import Laboratory from '../models/Laboratory';
import Test from '../models/Test';
import Package from '../models/Package';
import { BookingStatus, CollectionStatus, UserRole } from '../types';
import { sendBookingConfirmedEmail } from '../utils/mailer';
import { getPlatformSettings } from '../models/PlatformSettings';
import spacesClient from '../config/spaces';

export const createBooking = async (req: Request, res: Response): Promise<void> => {
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

    let status = BookingStatus.PENDING;

    if (labId === 'admin') {
      labId = undefined; // Litmus Smart Allocation
    } else if (labId) {
      const lab = await Laboratory.findById(labId);
      if (lab && lab.isAutoBooking) {
        status = BookingStatus.IN_PROGRESS; // Auto-approved and moved to lab side
      }
    }

    const collectionMethod = metadata?.collectionMethod || metadata?.collectionDetails?.collectionMethod;
    const collectionCity = metadata?.collectionDetails?.city || '';
    let collectionStatus = CollectionStatus.PENDING;

    if (collectionMethod === 'PICKUP') {
      const settings = await getPlatformSettings();
      const allowed = (settings.pickupCities || []).map((c) => c.trim().toLowerCase());
      const cityNorm = String(collectionCity).trim().toLowerCase();
      const isCovered = allowed.some((c) => cityNorm === c || cityNorm.includes(c) || c.includes(cityNorm));
      if (!isCovered) {
        res.status(400).json({
          success: false,
          message: `Pickup is not available in ${collectionCity || 'this city'}. Use courier, or choose a covered city.`,
        });
        return;
      }
    } else if (collectionMethod === 'COURIER') {
      collectionStatus = CollectionStatus.NOT_REQUIRED;
    }

    const booking = await Booking.create({
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
      const populatedBooking = await Booking.findById(booking._id)
        .populate('userId', 'firstName lastName email')
        .populate('items.testId', 'testName')
        .populate('items.packageId', 'name');

      if (populatedBooking && (populatedBooking.userId as any).email) {
        const user = populatedBooking.userId as any;
        const customerName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        
        const testNames = populatedBooking.items.map(item => {
          if (item.testId) return (item.testId as any).testName;
          if (item.packageId) return (item.packageId as any).name;
          return 'Unknown Test';
        }).filter(Boolean).join(', ');

        const productNames = populatedBooking.items.map(item => {
          return item.samples?.map(s => s.productName).filter(Boolean).join(', ');
        }).filter(Boolean).join(', ');

        const totalSamples = populatedBooking.items.reduce((total, item) => {
          return total + (item.samples?.reduce((sum, s) => sum + (Number(s.quantity) || 1), 0) || 0);
        }, 0);

        await sendBookingConfirmedEmail(user.email, {
          customerName,
          bookingId: booking._id.toString(),
          productName: productNames || 'N/A',
          testList: testNames || 'N/A',
          sampleQty: totalSamples.toString(),
          bookingDate: new Date(bookingDate).toLocaleDateString(),
        });
      }
    } catch (emailErr) {
      console.error('Error sending booking confirmation email:', emailErr);
    }

    res.status(201).json({
      success: true,
      data: booking,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Failed to create booking',
      error: error.message,
    });
  }
};

export const getMyBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const requestedLimit = parseInt(String(req.query.limit ?? '10'), 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 10;
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || 'all').toLowerCase();
    const reportsOnly = String(req.query.reportsOnly || '') === 'true' || status === 'reports';

    const filter: Record<string, any> = { userId };

    if (status === 'active') {
      filter.status = { $in: [BookingStatus.PENDING, BookingStatus.APPROVED, BookingStatus.IN_PROGRESS] };
    } else if (status === 'completed') {
      filter.status = BookingStatus.COMPLETED;
    } else if (reportsOnly) {
      filter.isReportApprovedByAdmin = true;
      filter.reportFiles = { $exists: true, $not: { $size: 0 } };
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(escaped, 'i');
      const [tests, packages] = await Promise.all([
        Test.find({ testName: rx }).select('_id'),
        Package.find({ name: rx }).select('_id'),
      ]);
      const or: Record<string, any>[] = [
        { 'items.samples.productName': rx },
      ];
      if (tests.length) or.push({ 'items.testId': { $in: tests.map((t) => t._id) } });
      if (packages.length) or.push({ 'items.packageId': { $in: packages.map((p) => p._id) } });
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

    const total = await Booking.countDocuments(filter);
    const pages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, pages);
    const skip = (safePage - 1) * limit;

    const bookings = await Booking.find(filter)
      .populate('labId', 'labName location')
      .populate('items.testId', 'testName price metadata')
      .populate('items.packageId', 'name tests')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    const sanitizedBookings = bookings.map((b) => {
      const obj = b.toObject();
      if (!obj.isReportApprovedByAdmin) {
        delete obj.reportFiles;
      }
      return obj;
    });

    res.status(200).json({
      success: true,
      count: sanitizedBookings.length,
      total,
      page: safePage,
      pages,
      limit,
      data: sanitizedBookings,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: error.message,
    });
  }
};

export const getBookingById = async (req: Request, res: Response): Promise<void> => {
  try {
    const booking = await Booking.findById(req.params.id)
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
    if (booking.userId._id.toString() !== req.user?.id && req.user?.role === UserRole.USER) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking',
      });
      return;
    }

    const obj = booking.toObject();
    if (!obj.isReportApprovedByAdmin && req.user?.role === UserRole.USER) {
      delete obj.reportFiles;
    }

    res.status(200).json({
      success: true,
      data: obj,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking',
      error: error.message,
    });
  }
};

export const updateCourierTracking = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { trackingId, courierName, notes } = req.body;

    if (!trackingId || !String(trackingId).trim()) {
      res.status(400).json({ success: false, message: 'Tracking ID is required' });
      return;
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    if (booking.userId.toString() !== userId) {
      res.status(403).json({ success: false, message: 'Not authorized to update this booking' });
      return;
    }

    const method = booking.collectionMethod || booking.metadata?.collectionMethod;
    if (method !== 'COURIER') {
      res.status(400).json({ success: false, message: 'Tracking can only be added for courier bookings' });
      return;
    }

    booking.courierDetails = {
      trackingId: String(trackingId).trim(),
      courierName: courierName ? String(courierName).trim() : '',
      notes: notes ? String(notes).trim() : '',
      submittedAt: new Date(),
    };
    booking.collectionStatus = CollectionStatus.SHIPPED;
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Courier tracking saved',
      data: booking,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to save tracking details',
      error: error.message,
    });
  }
};

export const downloadBookingReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    const ownerId = booking.userId?.toString();
    if (ownerId !== req.user?.id && req.user?.role === UserRole.USER) {
      res.status(403).json({ success: false, message: 'Not authorized to download this report' });
      return;
    }

    if (!booking.isReportApprovedByAdmin || !booking.reportFiles?.length) {
      res.status(404).json({ success: false, message: 'Report is not available yet' });
      return;
    }

    const fileUrl = booking.reportFiles[0];
    const parsed = new URL(fileUrl);
    const key = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
    const ext = path.extname(key) || path.extname(parsed.pathname) || '.pdf';
    const filename = `litmus-report-${booking._id.toString().slice(-6)}${ext}`;
    const encoded = encodeURIComponent(filename);

    const bucketName = process.env.DO_SPACES_NAME;
    if (bucketName && key.startsWith('litmus_uploads/')) {
      const obj = await spacesClient.send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to download report',
      error: error.message,
    });
  }
};
