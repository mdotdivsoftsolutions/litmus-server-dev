import { Request, Response } from 'express';

export const getPendingApprovals = async (req: Request, res: Response): Promise<void> => {
  try {
    const { default: Test } = await import('../../models/Test');
    const { default: Package } = await import('../../models/Package');
    const { default: Booking } = await import('../../models/Booking');
    const { ApprovalStatus } = await import('../../types');

    const pendingTests = await Test.find({ approvalStatus: ApprovalStatus.PENDING })
      .populate('labId', 'labName')
      .sort('-createdAt');
      
    const pendingPackages = await Package.find({ approvalStatus: ApprovalStatus.PENDING })
      .populate('createdBy', 'firstName lastName email')
      .sort('-createdAt');

    const pendingReports = await Booking.find({
      isReportApprovedByAdmin: false,
      $or: [
        { reportFiles: { $exists: true, $not: { $size: 0 } } },
        { reportUrl: { $exists: true, $ne: '' } },
        { 'reportSummary.summary': { $exists: true, $ne: '' } },
      ],
    })
      .populate('userId', 'firstName lastName email phone')
      .populate('labId', 'labName contactEmail')
      .sort('-updatedAt');

    res.status(200).json({
      success: true,
      data: {
        tests: pendingTests,
        packages: pendingPackages,
        reports: pendingReports,
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch pending approvals', error: error.message });
  }
};

export const approveTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { default: Test } = await import('../../models/Test');
    const { ApprovalStatus } = await import('../../types');

    const test = await Test.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: ApprovalStatus.APPROVED, $unset: { rejectionReason: 1 } },
      { new: true }
    );

    if (!test) { 
      res.status(404).json({ success: false, message: 'Test not found' }); 
      return; 
    }

    res.status(200).json({ success: true, message: 'Test approved successfully', data: test });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to approve test', error: error.message });
  }
};

export const rejectTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { default: Test } = await import('../../models/Test');
    const { ApprovalStatus } = await import('../../types');
    const { reason } = req.body;

    if (!reason) { 
      res.status(400).json({ success: false, message: 'Rejection reason is required' }); 
      return; 
    }

    const test = await Test.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: ApprovalStatus.REJECTED, rejectionReason: reason },
      { new: true }
    );

    if (!test) { 
      res.status(404).json({ success: false, message: 'Test not found' }); 
      return; 
    }

    res.status(200).json({ success: true, message: 'Test rejected successfully', data: test });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to reject test', error: error.message });
  }
};

export const approvePackage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { default: Package } = await import('../../models/Package');
    const { ApprovalStatus } = await import('../../types');

    const pkg = await Package.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: ApprovalStatus.APPROVED, $unset: { rejectionReason: 1 } },
      { new: true }
    );

    if (!pkg) { 
      res.status(404).json({ success: false, message: 'Package not found' }); 
      return; 
    }

    res.status(200).json({ success: true, message: 'Package approved successfully', data: pkg });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to approve package', error: error.message });
  }
};

export const rejectPackage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { default: Package } = await import('../../models/Package');
    const { ApprovalStatus } = await import('../../types');
    const { reason } = req.body;

    if (!reason) { 
      res.status(400).json({ success: false, message: 'Rejection reason is required' }); 
      return; 
    }

    const pkg = await Package.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: ApprovalStatus.REJECTED, rejectionReason: reason },
      { new: true }
    );

    if (!pkg) { 
      res.status(404).json({ success: false, message: 'Package not found' }); 
      return; 
    }

    res.status(200).json({ success: true, message: 'Package rejected successfully', data: pkg });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to reject package', error: error.message });
  }
};
