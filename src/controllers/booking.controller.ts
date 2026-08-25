import { Request, Response } from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import Booking from '../models/Booking';
import Laboratory from '../models/Laboratory';
import Test from '../models/Test';
import Package from '../models/Package';
import { BookingStatus, CollectionStatus, UserRole } from '../types';
import { sendBookingConfirmedEmail } from '../utils/mailer';
import NotificationService from '../services/notification.service';
import { getPlatformSettings } from '../models/PlatformSettings';

import spacesClient from '../config/spaces';
import {
  parseBookingListParams,
  bookingListStatusFilter,
  escapeRegex,
  isPickupCityCovered,
  canAddCourierTracking,
  canDownloadBookingReport,
  sanitizeBookingReports,
  collectionStatusForMethod,
} from '../utils/bookingRules';

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
    let collectionStatus = collectionStatusForMethod(collectionMethod);

    if (collectionMethod === 'PICKUP') {
      const settings = await getPlatformSettings();
      if (!isPickupCityCovered(collectionCity, settings.pickupCities || [])) {
        res.status(400).json({
          success: false,
          message: `Pickup is not available in ${collectionCity || 'this city'}. Use courier, or choose a covered city.`,
        });
        return;
      }
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
    const { page, limit, search, status, reportsOnly } = parseBookingListParams(req.query as Record<string, unknown>);

    const filter: Record<string, any> = { userId, ...bookingListStatusFilter(status, reportsOnly) };

    if (search) {
      const escaped = escapeRegex(search);
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

    const sanitizedBookings = bookings.map((b) => sanitizeBookingReports(b.toObject()));

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
    const rawId = String(req.params.id);
    let query: any;

    if (mongoose.Types.ObjectId.isValid(rawId) && rawId.length === 24) {
      query = { _id: rawId };
    } else {
      query = {
        $or: [
          { 'metadata.bookingId': rawId },
          { 'metadata.orderId': rawId },
          { 'metadata.displayBookingId': rawId },
          { invoiceNumber: rawId },
        ],
      };
    }

    const booking = await Booking.findOne(query)
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
      delete obj.reportSummary;
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

    const booking = await Booking.findById(req.params.id);
    const access = canAddCourierTracking({
      trackingId,
      userId,
      bookingUserId: booking?.userId?.toString(),
      collectionMethod: booking?.collectionMethod,
      metadataCollectionMethod: booking?.metadata?.collectionMethod,
    });
    if (!access.ok) {
      res.status(access.status).json({ success: false, message: access.message });
      return;
    }
    if (!booking) return;

    if (!booking.metadata) booking.metadata = {};
    if (!Array.isArray(booking.metadata.trackingHistory)) {
      booking.metadata.trackingHistory = [];
    }

    const previousTracking = booking.courierDetails?.trackingId;
    booking.metadata.trackingHistory.unshift({
      trackingId: String(trackingId).trim(),
      previousTrackingId: previousTracking || null,
      courierName: courierName ? String(courierName).trim() : '',
      notes: notes ? String(notes).trim() : '',
      updatedAt: new Date(),
      updatedBy: 'USER',
    });

    booking.courierDetails = {
      trackingId: String(trackingId).trim(),
      courierName: courierName ? String(courierName).trim() : '',
      notes: notes ? String(notes).trim() : '',
      submittedAt: booking.courierDetails?.submittedAt || new Date(),
    };
    booking.collectionStatus = CollectionStatus.SHIPPED;
    if (!booking.metadata.collectorAssignedAt) {
      booking.metadata.collectorAssignedAt = booking.courierDetails.submittedAt;
    }
    booking.markModified('metadata');
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
    const access = canDownloadBookingReport({
      bookingExists: Boolean(booking),
      ownerId: booking?.userId?.toString(),
      requesterId: req.user?.id,
      requesterRole: req.user?.role,
      isReportApprovedByAdmin: booking?.isReportApprovedByAdmin,
      reportFiles: booking?.reportFiles,
    });
    if (!access.ok) {
      res.status(access.status).json({ success: false, message: access.message });
      return;
    }
    if (!booking) return;

    const fileUrl = booking.reportFiles?.[0];
    if (!fileUrl) {
      res.status(404).json({ success: false, message: 'Report file not found' });
      return;
    }
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
