import { Request, Response } from 'express';
import { SystemOption } from '../models/SystemOption';

// Get options (optionally filtered by category)
export const getOptions = async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    const filter: any = {};
    if (category) {
      filter.category = category;
    }
    
    // Only return active options for standard fetching
    filter.isActive = true;

    const options = await SystemOption.find(filter).sort({ value: 1 });
    res.status(200).json({ success: true, data: options });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create a new option
export const createOption = async (req: Request, res: Response) => {
  try {
    const { category, value } = req.body;
    if (!category || !value) {
      return res.status(400).json({ success: false, message: 'Category and value are required' });
    }

    const existingOption = await SystemOption.findOne({ category, value });
    if (existingOption) {
      if (!existingOption.isActive) {
        existingOption.isActive = true;
        await existingOption.save();
        return res.status(200).json({ success: true, data: existingOption, message: 'Option restored successfully' });
      }
      return res.status(400).json({ success: false, message: 'This option already exists' });
    }

    const newOption = new SystemOption({ category, value });
    await newOption.save();

    res.status(201).json({ success: true, data: newOption, message: 'Option created successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete an option
export const deleteOption = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedOption = await SystemOption.findByIdAndUpdate(id, { isActive: false }, { new: true });
    
    if (!deletedOption) {
      return res.status(404).json({ success: false, message: 'Option not found' });
    }

    res.status(200).json({ success: true, message: 'Option deactivated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
