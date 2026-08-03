import { Request, Response } from 'express';
import Package from '../models/Package';
import { IPackage } from '../types';
import logger from '../utils/logger';

// @desc    Create a new package
// @route   POST /api/v1/packages
// @access  Private/Admin/Lab
export const createPackage = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      testCount,
      price,
      mrp,
      tat,
      category,
      categoryId,
      tests,
      discountType,
      discountValue,
      tag,
      features,
      image,
    } = req.body;

    // Use req.user?.id if authentication middleware attaches user
    // Fallback to a placeholder if needed during dev, but assume req.user is set
    const createdBy = (req as any).user?.id;

    if (!createdBy) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to create package. User ID missing.',
      });
    }

    const newPackage: IPackage = await Package.create({
      name,
      description,
      testCount,
      price,
      mrp,
      tat,
      category,
      categoryId,
      tests,
      discountType,
      discountValue,
      tag,
      features,
      image,
      createdBy,
    });

    res.status(201).json({
      success: true,
      data: newPackage,
    });
  } catch (error: any) {
    logger.error(`Error in createPackage: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error: Could not create package',
      error: error.message,
    });
  }
};

// @desc    Get all packages
// @route   GET /api/v1/packages
// @access  Public
export const getPackages = async (req: Request, res: Response) => {
  try {
    const query: any = {};
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search as string, 'i');
      query.$or = [
        { name: searchRegex },
        { description: searchRegex }
      ];
    }

    const packages = await Package.find(query)
      .populate('categoryId', 'name')
      .populate('tests', 'testName price offerPrice')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: packages.length,
      data: packages,
    });
  } catch (error: any) {
    logger.error(`Error in getPackages: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error: Could not fetch packages',
    });
  }
};

// @desc    Get single package by ID
// @route   GET /api/v1/packages/:id
// @access  Public
export const getPackageById = async (req: Request, res: Response) => {
  try {
    const pkg = await Package.findById(req.params.id)
      .populate('categoryId', 'name')
      .populate('tests', 'testName price offerPrice');

    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    res.status(200).json({
      success: true,
      data: pkg,
    });
  } catch (error: any) {
    logger.error(`Error in getPackageById: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error: Could not fetch package details',
    });
  }
};

// @desc    Update a package
// @route   PUT /api/v1/packages/:id
// @access  Private/Admin/Lab
export const updatePackage = async (req: Request, res: Response) => {
  try {
    let pkg = await Package.findById(req.params.id);

    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    // Optional: Add logic here to check if the user updating is the one who created it (for labs)
    // if ((req as any).user.role === 'LAB' && pkg.createdBy.toString() !== (req as any).user.id) { ... }

    pkg = await Package.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: pkg,
    });
  } catch (error: any) {
    logger.error(`Error in updatePackage: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error: Could not update package',
    });
  }
};

// @desc    Delete a package
// @route   DELETE /api/v1/packages/:id
// @access  Private/Admin/Lab
export const deletePackage = async (req: Request, res: Response) => {
  try {
    const pkg = await Package.findById(req.params.id);

    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    await pkg.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Package deleted successfully',
    });
  } catch (error: any) {
    logger.error(`Error in deletePackage: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error: Could not delete package',
    });
  }
};
