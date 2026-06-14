import { Request, Response } from 'express';
import Booking from '../models/Booking';
import { BookingStatus, UserRole } from '../types';

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

    if (labId === 'admin') {
      labId = undefined; // Litmus Smart Allocation
    }

    const booking = await Booking.create({
      userId,
      labId,
      items,
      bookingDate,
      totalAmount,
      metadata,
      status: BookingStatus.PENDING,
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
    const bookings = await Booking.find({ userId })
      .populate('labId', 'labName location')
      .populate('items.testId', 'testName price metadata')
      .populate('items.packageId', 'name tests')
      .sort('-createdAt');

    const sanitizedBookings = bookings.map(b => {
      const obj = b.toObject();
      if (!obj.isReportApprovedByAdmin) {
        delete obj.reportFiles;
      }
      return obj;
    });

    res.status(200).json({
      success: true,
      count: sanitizedBookings.length,
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
