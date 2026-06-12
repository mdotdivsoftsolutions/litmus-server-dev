import { Request, Response } from 'express';
import Laboratory from '../models/Laboratory';
import User from '../models/User';
import { UserRole } from '../types';
import { sendLabWelcomeEmail } from '../utils/mailer';

export const createLab = async (req: Request, res: Response): Promise<void> => {
  try {
    let generatedPassword = '';
    
    // Create a User account if email is provided
    if (req.body.contactEmail && req.body.contactPhone && req.body.labName) {
      const existingUser = await User.findOne({ email: req.body.contactEmail });
      
      if (existingUser) {
        res.status(400).json({
          success: false,
          message: 'User with this email already exists',
        });
        return;
      }

      const rawPassword = req.body.password || `${req.body.labName.substring(0, 4).replace(/\s/g, '')}${req.body.contactPhone.substring(0, 4)}${req.body.startingYear || ''}`;
      
      if (!req.body.password) {
        generatedPassword = rawPassword;
      }

      const user = new User({
        firstName: req.body.labName,
        email: req.body.contactEmail,
        phone: req.body.contactPhone,
        password: rawPassword,
        role: UserRole.LAB,
      });

      await user.save();
      req.body.userId = user._id;
    } else if (!req.body.userId) {
       res.status(400).json({
          success: false,
          message: 'Contact email, phone, and lab name are required to create a lab account.',
       });
       return;
    }

    const lab = await Laboratory.create(req.body);
    
    if (req.body.contactEmail) {
      sendLabWelcomeEmail(
        req.body.contactEmail,
        req.body.labName,
        generatedPassword || undefined
      );
    }

    res.status(201).json({
      success: true,
      data: lab,
      generatedPassword: generatedPassword || undefined,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Failed to create laboratory',
      error: error.message,
    });
  }
};

export const getLabs = async (req: Request, res: Response): Promise<void> => {
  try {
    const labs = await Laboratory.find({ isDeleted: { $ne: true } }).populate('tests');
    res.status(200).json({
      success: true,
      count: labs.length,
      data: labs,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch laboratories',
      error: error.message,
    });
  }
};

export const getLabById = async (req: Request, res: Response): Promise<void> => {
  try {
    const lab = await Laboratory.findById(req.params.id).populate('tests');
    
    if (!lab) {
      res.status(404).json({
        success: false,
        message: 'Laboratory not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: lab,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch laboratory',
      error: error.message,
    });
  }
};

// Helper function for Haversine distance
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

export const getLabsPublic = async (req: Request, res: Response): Promise<void> => {
  try {
    const query: any = { isDeleted: { $ne: true }, isActive: true };
    if (req.query.isTrusted === 'true') {
      query.isTrusted = true;
    }
    let labs = await Laboratory.find(query).populate('tests');
    
    // Check if location based sorting is requested
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : null;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : null;
    
    // Also check for the text 'location' param just in case
    const locationStr = req.query.location as string;

    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      // Sort labs by distance
      labs.sort((a, b) => {
        const aLoc = a.location || {};
        const bLoc = b.location || {};
        
        const aLat = aLoc.latitude || aLoc.lat;
        const aLng = aLoc.longitude || aLoc.lng;
        
        const bLat = bLoc.latitude || bLoc.lat;
        const bLng = bLoc.longitude || bLoc.lng;
        
        if (aLat !== undefined && aLng !== undefined && bLat !== undefined && bLng !== undefined) {
          const distA = getDistance(lat, lng, aLat, aLng);
          const distB = getDistance(lat, lng, bLat, bLng);
          return distA - distB;
        }
        
        // Push labs without proper coordinates to the end
        if (aLat === undefined) return 1;
        if (bLat === undefined) return -1;
        return 0;
      });
    } else if (locationStr) {
      // Basic text filter fallback if just location=kochi is passed
      labs = labs.filter(lab => {
        const locString = JSON.stringify(lab.location).toLowerCase();
        return locString.includes(locationStr.toLowerCase());
      });
    }

    res.status(200).json({
      success: true,
      count: labs.length,
      data: labs,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch laboratories',
      error: error.message,
    });
  }
};

export const getLabByIdPublic = async (req: Request, res: Response): Promise<void> => {
  try {
    const lab = await Laboratory.findById(req.params.id).populate('tests');
    
    if (!lab || lab.isDeleted || !lab.isActive) {
      res.status(404).json({
        success: false,
        message: 'Laboratory not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: lab,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch laboratory',
      error: error.message,
    });
  }
};

export const updateLab = async (req: Request, res: Response): Promise<void> => {
  try {
    const lab = await Laboratory.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!lab) {
      res.status(404).json({
        success: false,
        message: 'Laboratory not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: lab,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Failed to update laboratory',
      error: error.message,
    });
  }
};

export const deleteLab = async (req: Request, res: Response): Promise<void> => {
  try {
    const lab = await Laboratory.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );

    if (!lab) {
      res.status(404).json({
        success: false,
        message: 'Laboratory not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete laboratory',
      error: error.message,
    });
  }
};

export const submitBookingResult = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reportUrl } = req.body;
    
    if (!reportUrl) {
      res.status(400).json({
        success: false,
        message: 'Please provide a reportUrl',
      });
      return;
    }

    import('../models/Booking').then(async ({ default: Booking }) => {
      const booking = await Booking.findById(req.params.bookingId).populate('labId');
      
      if (!booking) {
        res.status(404).json({
          success: false,
          message: 'Booking not found',
        });
        return;
      }

      const lab = booking.labId as any;

      if (!booking.reportFiles) {
        booking.reportFiles = [];
      }
      booking.reportFiles.push(reportUrl);
      
      const requiresAdminApproval = lab.requiresAdminApprovalForReport !== undefined ? lab.requiresAdminApprovalForReport : true;
      
      if (requiresAdminApproval) {
        booking.isReportApprovedByAdmin = false;
        import('../types').then(({ BookingStatus }) => {
          booking.status = BookingStatus.IN_PROGRESS;
          booking.save().then((updatedBooking) => {
            res.status(200).json({
              success: true,
              message: 'Result submitted and pending admin approval',
              data: updatedBooking,
            });
          });
        });
      } else {
        booking.isReportApprovedByAdmin = true;
        import('../types').then(({ BookingStatus }) => {
          booking.status = BookingStatus.COMPLETED;
          booking.save().then((updatedBooking) => {
            res.status(200).json({
              success: true,
              message: 'Result submitted and approved automatically',
              data: updatedBooking,
            });
          });
        });
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to submit result',
      error: error.message,
    });
  }
};
