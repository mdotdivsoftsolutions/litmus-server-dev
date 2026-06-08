import { Request, Response } from 'express';
import Test from '../models/Test';

export const createTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const test = await Test.create(req.body);
    res.status(201).json({
      success: true,
      data: test,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Failed to create test',
      error: error.message,
    });
  }
};

export const getTests = async (req: Request, res: Response): Promise<void> => {
  try {
    const tests = await Test.find().populate('applicableCategories', 'name');
    res.status(200).json({
      success: true,
      count: tests.length,
      data: tests,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tests',
      error: error.message,
    });
  }
};

export const getTestById = async (req: Request, res: Response): Promise<void> => {
  try {
    const test = await Test.findById(req.params.id).populate('applicableCategories', 'name');
    if (!test) {
      res.status(404).json({
        success: false,
        message: 'Test not found',
      });
      return;
    }
    res.status(200).json({
      success: true,
      data: test,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test',
      error: error.message,
    });
  }
};

export const updateTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const test = await Test.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!test) {
      res.status(404).json({
        success: false,
        message: 'Test not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: test,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Failed to update test',
      error: error.message,
    });
  }
};

export const deleteTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const test = await Test.findByIdAndDelete(req.params.id);

    if (!test) {
      res.status(404).json({
        success: false,
        message: 'Test not found',
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
      message: 'Failed to delete test',
      error: error.message,
    });
  }
};
