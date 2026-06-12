import { Request, Response } from 'express';
import InfrastructureOption from '../models/InfrastructureOption';

export const getInfrastructureOptions = async (req: Request, res: Response) => {
  try {
    const options = await InfrastructureOption.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: options });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const createInfrastructureOption = async (req: Request, res: Response) => {
  try {
    const { title, description, icon } = req.body;
    if (!title || !description) return res.status(400).json({ success: false, message: 'Title and description are required' });

    const newOption = await InfrastructureOption.create({ 
      title, 
      description, 
      icon: icon || 'microscope' 
    });
    res.status(201).json({ success: true, data: newOption });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const deleteInfrastructureOption = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await InfrastructureOption.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Option not found' });
    
    res.status(200).json({ success: true, message: 'Option deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
