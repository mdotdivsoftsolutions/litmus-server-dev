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
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 0; // 0 means no limit
    
    const query: any = {};
    if (req.query.isPopular === 'true') {
      query.isPopular = true;
    } else if (req.query.isPopular === 'false') {
      query.isPopular = false;
    }

    if (req.query.category) {
      query.$or = [
        { applicableCategories: req.query.category },
        { isApplicableToAll: true }
      ];
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search as string, 'i');
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: [{ testName: searchRegex }, { parameters: searchRegex }] }
        ];
        delete query.$or;
      } else {
        query.$or = [
          { testName: searchRegex },
          { parameters: searchRegex }
        ];
      }
    }

    const skip = (page - 1) * (limit || 10);

    const testQuery = Test.find(query)
      .populate('applicableCategories', 'name')
      .populate('labId', 'labName');
    
    if (limit > 0) {
      testQuery.skip(skip).limit(limit);
    }

    const tests = await testQuery;
    const total = await Test.countDocuments(query);

    res.status(200).json({
      success: true,
      count: tests.length,
      total,
      page,
      pages: limit > 0 ? Math.ceil(total / limit) : 1,
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
    const test = await Test.findById(req.params.id)
      .populate('applicableCategories', 'name')
      .populate('labId', 'labName');
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
