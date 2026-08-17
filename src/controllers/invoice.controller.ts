import { Request, Response } from 'express';
import Booking from '../models/Booking';
import Payment from '../models/Payment';
import { UserRole } from '../types';
import { buildInvoiceData, generateInvoiceHtml, generateInvoiceNumber } from '../services/invoice.service';
import logger from '../utils/logger';

/**
 * Validates role-based access for a booking invoice
 */
async function canAccessBookingInvoice(req: Request, booking: any): Promise<boolean> {
  const user = req.user;
  if (!user) return false;

  if (user.role === UserRole.ADMIN) return true;

  if (user.role === UserRole.USER && booking.userId?._id?.toString() === user.id) {
    return true;
  }

  if ((user.role === UserRole.LAB || user.role === UserRole.LAB_EMPLOYEE) && user.labId) {
    const bookingLabId = booking.labId?._id ? booking.labId._id.toString() : booking.labId?.toString();
    if (bookingLabId === user.labId.toString()) {
      return true;
    }
  }

  return false;
}

/**
 * GET /api/v1/booking/:id/invoice
 * Returns structured JSON invoice metadata and GST breakdown
 */
export const getBookingInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id)
      .populate('userId', 'firstName lastName email phone companyName fssaiNumber address')
      .populate('labId', 'labName nablAccreditationNumber isNablAccredited location')
      .populate('items.testId', 'testName price')
      .populate('items.packageId', 'name price');

    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    const hasAccess = await canAccessBookingInvoice(req, booking);
    if (!hasAccess) {
      res.status(403).json({ success: false, message: 'Access denied to this invoice' });
      return;
    }

    // Auto-generate invoice number if not already present
    if (!booking.invoiceNumber) {
      booking.invoiceNumber = generateInvoiceNumber(booking._id.toString(), booking.bookingDate || booking.createdAt);
      booking.invoiceDate = booking.invoiceDate || booking.createdAt || new Date();
      await booking.save();
    }

    const payment = await Payment.findOne({ bookingId: booking._id }).sort({ createdAt: -1 });
    const invoiceData = buildInvoiceData(booking, payment);

    res.status(200).json({
      success: true,
      data: invoiceData,
    });
  } catch (error: any) {
    logger.error(`getBookingInvoice error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to generate invoice', error: error.message });
  }
};

/**
 * GET /api/v1/booking/:id/invoice/html
 * Renders a full printable HTML invoice document for browser printing / PDF export
 */
export const renderBookingInvoiceHtml = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id)
      .populate('userId', 'firstName lastName email phone companyName fssaiNumber address')
      .populate('labId', 'labName nablAccreditationNumber isNablAccredited location')
      .populate('items.testId', 'testName price')
      .populate('items.packageId', 'name price');

    if (!booking) {
      res.status(404).send('<h2>Booking not found</h2>');
      return;
    }

    const hasAccess = await canAccessBookingInvoice(req, booking);
    if (!hasAccess) {
      res.status(403).send('<h2>Access denied to this invoice</h2>');
      return;
    }

    if (!booking.invoiceNumber) {
      booking.invoiceNumber = generateInvoiceNumber(booking._id.toString(), booking.bookingDate || booking.createdAt);
      booking.invoiceDate = booking.invoiceDate || booking.createdAt || new Date();
      await booking.save();
    }

    const payment = await Payment.findOne({ bookingId: booking._id }).sort({ createdAt: -1 });
    const invoiceData = buildInvoiceData(booking, payment);
    const html = generateInvoiceHtml(invoiceData);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (error: any) {
    logger.error(`renderBookingInvoiceHtml error: ${error.message}`);
    res.status(500).send(`<h2>Failed to generate invoice document: ${error.message}</h2>`);
  }
};
