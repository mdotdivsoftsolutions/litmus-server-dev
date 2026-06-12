import { Request, Response } from 'express';
import TestType from '../models/TestType';
import logger from '../utils/logger';

// @desc    Get all test types
// @route   GET /api/v1/test-types
// @access  Public
export const getTestTypes = async (req: Request, res: Response) => {
  try {
    const testTypes = await TestType.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: testTypes.length,
      data: testTypes,
    });
  } catch (error: any) {
    logger.error(`Error in getTestTypes: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error: Could not fetch test types',
    });
  }
};

// @desc    Create a test type
// @route   POST /api/v1/test-types
// @access  Private/Admin
export const createTestType = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    // Check if test type already exists
    const existingTestType = await TestType.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingTestType) {
      return res.status(400).json({
        success: false,
        message: 'Test Type with this name already exists',
      });
    }

    const testType = await TestType.create({ name });

    res.status(201).json({
      success: true,
      data: testType,
    });
  } catch (error: any) {
    logger.error(`Error in createTestType: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error: Could not create test type',
      error: error.message,
    });
  }
};

// @desc    Delete a test type
// @route   DELETE /api/v1/test-types/:id
// @access  Private/Admin
export const deleteTestType = async (req: Request, res: Response) => {
  try {
    const testType = await TestType.findById(req.params.id);

    if (!testType) {
      return res.status(404).json({
        success: false,
        message: 'Test Type not found',
      });
    }

    await testType.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Test Type deleted successfully',
    });
  } catch (error: any) {
    logger.error(`Error in deleteTestType: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error: Could not delete test type',
    });
  }
};
