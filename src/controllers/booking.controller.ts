import { Request, Response } from 'express';
import Booking from '../models/Booking';
import { BookingStatus, UserRole } from '../types';

export const createBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { labId, productId, selectedTests, bookingDate } = req.body;
    const userId = req.user?.id;

    if (!labId || !productId || !bookingDate) {
      res.status(400).json({
        success: false,
        message: 'Please provide labId, productId, and bookingDate',
      });
      return;
    }

    const booking = await Booking.create({
      userId,
      labId,
      productId,
      selectedTests,
      bookingDate,
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
      .populate('productId', 'name')
      .populate('selectedTests', 'testName price')
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
      .populate('productId')
      .populate('selectedTests')
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
