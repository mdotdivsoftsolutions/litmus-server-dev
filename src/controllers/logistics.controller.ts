import { Request, Response } from 'express';
import LogisticsOption from '../models/LogisticsOption';

export const getLogisticsOptions = async (req: Request, res: Response) => {
  try {
    const options = await LogisticsOption.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: options });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const createLogisticsOption = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

    const existing = await LogisticsOption.findOne({ name });
    if (existing) return res.status(400).json({ success: false, message: 'Option already exists' });

    const newOption = await LogisticsOption.create({ name });
    res.status(201).json({ success: true, data: newOption });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const deleteLogisticsOption = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await LogisticsOption.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Option not found' });
    
    res.status(200).json({ success: true, message: 'Option deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
