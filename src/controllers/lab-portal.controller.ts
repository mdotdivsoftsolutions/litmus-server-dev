import { Request, Response } from 'express';
import Laboratory from '../models/Laboratory';
import Booking from '../models/Booking';
import { BookingStatus } from '../types';

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
    const { status, collectorName, collectorContact } = req.body;
    const { id } = req.params;
    const userId = req.user?.id;
    const lab = await Laboratory.findOne({ userId });

    if (!lab) {
      res.status(404).json({ success: false, message: 'Laboratory not found for this user' });
      return;
    }

    import('../models/Booking').then(async ({ default: Booking }) => {
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
