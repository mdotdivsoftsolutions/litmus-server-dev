import { Request, Response } from 'express';
import ActivityStatus from '../models/ActivityStatus';

export const getActivityStatuses = async (req: Request, res: Response) => {
  try {
    const statuses = await ActivityStatus.find().sort({ createdAt: -1 });
    res.json({ success: true, data: statuses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const createActivityStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ success: false, message: 'Status name is required' });
      return;
    }

    const existing = await ActivityStatus.findOne({ name });
    if (existing) {
      res.status(400).json({ success: false, message: 'Status already exists' });
      return;
    }

    const status = await ActivityStatus.create({ name });
    res.status(201).json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const deleteActivityStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const status = await ActivityStatus.findByIdAndDelete(id);
    
    if (!status) {
      res.status(404).json({ success: false, message: 'Status not found' });
      return;
    }

    res.json({ success: true, message: 'Status deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
