import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../../models/User';
import { UserRole } from '../../types';

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, search, startDate, endDate, page, limit } = req.query;
    const filter: any = { role: UserRole.USER };

    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    }

    if (search) {
      const searchRegex = new RegExp(String(search).trim(), 'i');
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(String(startDate));
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(String(endDate));
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const pageNum = page ? parseInt(String(page), 10) || 1 : 1;
    const limitNum = limit ? parseInt(String(limit), 10) || 0 : 0;
    const skip = limitNum > 0 ? (pageNum - 1) * limitNum : 0;

    const total = await User.countDocuments(filter);

    let query = User.find(filter).sort({ createdAt: -1 });
    if (limitNum > 0) {
      query = query.skip(skip).limit(limitNum);
    }

    const users = await query;
    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page: pageNum,
      totalPages: limitNum > 0 ? Math.max(1, Math.ceil(total / limitNum)) : 1,
      data: users,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message,
    });
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message,
    });
  }
};

export const updateUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, isActive } = req.body;

    if (!userId || isActive === undefined) {
      res.status(400).json({
        success: false,
        message: 'Please provide userId and isActive status',
      });
      return;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true, runValidators: true }
    );

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `User status updated to ${isActive ? 'active' : 'inactive'}`,
      data: user,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: error.message,
    });
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, email, phone, password, role } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      if (existingUser.email === email) {
        res.status(400).json({ success: false, message: 'Email already registered' });
        return;
      }
      if (existingUser.phone === phone) {
        res.status(400).json({ success: false, message: 'Mobile number already registered' });
        return;
      }
    }

    const newUser = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password, // Pre-save hook will hash it
      role: role || UserRole.USER,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message,
    });
  }
};

export const getUserDetailedProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const { default: Booking } = await import('../../models/Booking');
    const { default: Payment } = await import('../../models/Payment');
    const { default: Cart } = await import('../../models/Cart');
    const { Consultation } = await import('../../models/Consultation');
    const { default: ChatSession } = await import('../../models/ChatSession');

    // Robust multi-key booking lookup
    const filterConditions: any[] = [
      { userId: user._id }
    ];
    if (typeof userId === 'string' && mongoose.Types.ObjectId.isValid(userId)) {
      filterConditions.push({ userId: new mongoose.Types.ObjectId(userId) });
    }
    if (user.email) {
      filterConditions.push({ 'collectionDetails.email': user.email });
      filterConditions.push({ 'userEmail': user.email });
    }
    if (user.phone) {
      filterConditions.push({ 'collectionDetails.phone': user.phone });
    }

    // Get bookings
    const bookings = await Booking.find({ $or: filterConditions })
      .populate('labId', 'labName location contactPhone contactEmail')
      .populate('items.testId', 'name testName metadata price tat sampleRequirement')
      .populate('items.packageId', 'name price tat sampleRequirement')
      .sort('-createdAt');

    // Get payments linked to bookings
    const bookingIds = bookings.map(b => b._id);
    const dbPayments = await Payment.find({ bookingId: { $in: bookingIds } })
      .populate({
        path: 'bookingId',
        select: 'totalAmount status createdAt labId bookingId',
        populate: { path: 'labId', select: 'labName' }
      })
      .sort('-createdAt');

    // Synthesize payments if missing
    const synthesizedPayments = bookings
      .filter(b => !dbPayments.some(p => String(p.bookingId?._id || p.bookingId) === String(b._id)))
      .map(b => ({
        _id: `PAY-${b._id}`,
        bookingId: b,
        amount: b.totalAmount || 0,
        status: ['SUCCESS', 'PAID', 'Approved', 'Completed'].includes(String(b.paymentStatus || b.status)) ? 'SUCCESS' : b.paymentStatus === 'FAILED' ? 'FAILED' : 'PENDING',
        method: b.metadata?.paymentMethod || 'Online Gateway',
        transactionId: b.metadata?.transactionId || b.metadata?.razorpay_payment_id || `TXN-${String(b._id).slice(-6).toUpperCase()}`,
        razorpayOrderId: b.metadata?.razorpay_order_id || `ORD-${String(b._id).slice(-6).toUpperCase()}`,
        createdAt: b.createdAt
      }));

    const allPayments = [...dbPayments, ...synthesizedPayments].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    // Get abandoned cart
    const cart = await Cart.findOne({ $or: [{ userId: user._id }, { userId }] })
      .populate('items.testId', 'name testName price')
      .populate('items.packageId', 'name price');

    // Get consultations
    const consultationFilters: any[] = [];
    if (user.email) consultationFilters.push({ email: user.email.toLowerCase() });
    if (user.phone) consultationFilters.push({ phone: user.phone });
    
    let consultations: any[] = [];
    if (consultationFilters.length > 0) {
      consultations = await Consultation.find({ $or: consultationFilters }).sort('-createdAt');
    }

    // Get Chat Sessions
    const chatFilters: any[] = [{ userId: user._id }];
    if (user.email) chatFilters.push({ 'guestInfo.email': user.email.toLowerCase() });
    if (user.phone) chatFilters.push({ 'guestInfo.phone': user.phone });
    const chatSessions = await ChatSession.find({ $or: chatFilters })
      .populate('assignedAgent', 'firstName lastName')
      .sort('-createdAt')
      .limit(10);

    // Stats calculations
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(b => String(b.status).toUpperCase() === 'COMPLETED').length;
    const pendingBookings = bookings.filter(b => !['COMPLETED', 'REJECTED', 'CANCELLED'].includes(String(b.status).toUpperCase())).length;
    const unpaidBookings = bookings.filter(b => !['SUCCESS', 'PAID'].includes(String(b.paymentStatus || '').toUpperCase()) && !['CANCELLED', 'REJECTED'].includes(String(b.status).toUpperCase())).length;
    const cancelledBookings = bookings.filter(b => ['CANCELLED', 'REJECTED'].includes(String(b.status).toUpperCase())).length;

    const totalAmountPaid = bookings
      .filter(b => ['SUCCESS', 'PAID'].includes(String(b.paymentStatus || '').toUpperCase()) || String(b.status).toUpperCase() === 'COMPLETED')
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0)
      || allPayments.filter(p => p.status === 'SUCCESS').reduce((sum, p) => sum + (p.amount || 0), 0);

    const totalUnpaidAmount = bookings
      .filter(b => !['SUCCESS', 'PAID'].includes(String(b.paymentStatus || '').toUpperCase()) && !['CANCELLED', 'REJECTED'].includes(String(b.status).toUpperCase()))
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    const averageOrderValue = totalBookings > 0 ? Math.round(totalAmountPaid / (completedBookings || totalBookings || 1)) : 0;
    const firstBookingDate = bookings.length > 0 ? bookings[bookings.length - 1].createdAt : null;
    const lastBookingDate = bookings.length > 0 ? bookings[0].createdAt : null;

    // Timeline activities
    const activities: Array<{
      id: string;
      type: 'REGISTRATION' | 'LOGIN' | 'BOOKING' | 'PAYMENT' | 'CONSULTATION' | 'SUPPORT_CHAT';
      title: string;
      description: string;
      date: Date;
      status?: string;
      metadata?: any;
    }> = [];

    if (user.createdAt) {
      activities.push({
        id: `ACT-REG-${user._id}`,
        type: 'REGISTRATION',
        title: 'Account Registered',
        description: `Client account created on Litmus platform via ${user.phone ? 'Phone verification' : 'Email registration'}.`,
        date: user.createdAt,
        status: user.isActive ? 'Active' : 'Suspended',
      });
    }

    if (user.lastLoginAt) {
      activities.push({
        id: `ACT-LOG-${user._id}`,
        type: 'LOGIN',
        title: 'Last Portal Session',
        description: 'Client logged into the Litmus portal.',
        date: user.lastLoginAt,
      });
    }

    bookings.forEach((b: any) => {
      const bkgCode = `BKG-${String(b._id).slice(-6).toUpperCase()}`;
      activities.push({
        id: `ACT-BKG-${b._id}`,
        type: 'BOOKING',
        title: `Placed Order ${bkgCode}`,
        description: `Diagnostic booking created for ₹${b.totalAmount?.toLocaleString() || 0} (${b.status || 'Pending'}).`,
        date: b.createdAt,
        status: b.status,
        metadata: { bookingId: b._id, amount: b.totalAmount },
      });
    });

    allPayments.forEach((p: any) => {
      if (p.status === 'SUCCESS') {
        activities.push({
          id: `ACT-PAY-${p._id}`,
          type: 'PAYMENT',
          title: `Payment Received (₹${p.amount?.toLocaleString() || 0})`,
          description: `Processed via ${p.method || 'Online Gateway'} (${p.transactionId || 'Success'}).`,
          date: p.createdAt,
          status: 'SUCCESS',
        });
      }
    });

    consultations.forEach((c: any) => {
      activities.push({
        id: `ACT-CNS-${c._id}`,
        type: 'CONSULTATION',
        title: `Requested Consultation: ${c.topic || c.serviceName || 'Diagnostic Inquiries'}`,
        description: `Status: ${c.status || 'Pending'}. Scheduled with Litmus technical team.`,
        date: c.createdAt,
        status: c.status,
      });
    });

    chatSessions.forEach((s: any) => {
      activities.push({
        id: `ACT-CHT-${s._id}`,
        type: 'SUPPORT_CHAT',
        title: `Support Inquiry (${s.sessionId})`,
        description: `Live chat session with ${s.assignedAgent?.firstName || 'Litmus Support'}. Status: ${s.status}.`,
        date: s.createdAt,
        status: s.status,
      });
    });

    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.status(200).json({
      success: true,
      data: {
        user,
        stats: {
          totalBookings,
          completedBookings,
          pendingBookings,
          unpaidBookings,
          cancelledBookings,
          totalAmountPaid,
          totalUnpaidAmount,
          averageOrderValue,
          firstBookingDate,
          lastBookingDate,
          totalConsultations: consultations.length,
          totalSupportChats: chatSessions.length,
        },
        bookings,
        payments: allPayments,
        cart: cart || { items: [] },
        consultations,
        chatSessions,
        activities,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch detailed user profile',
      error: error.message,
    });
  }
};

export const updateAdminUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;
    const updates = req.body;

    delete updates.password;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'User profile updated successfully',
      data: user,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update user profile',
      error: error.message,
    });
  }
};

export const addUserAdminNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;
    const { note } = req.body;

    if (!note || !note.trim()) {
      res.status(400).json({ success: false, message: 'Note text is required' });
      return;
    }

    const authUser = (req as any).user;
    const authorName = authUser ? `${authUser.firstName || ''} ${authUser.lastName || ''}`.trim() || 'Admin Specialist' : 'Staff Member';

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $push: {
          adminNotes: {
            note: note.trim(),
            authorId: authUser?._id,
            authorName,
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Staff note added to user profile',
      data: user.adminNotes,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to add staff note',
      error: error.message,
    });
  }
};
