import { Request, Response } from 'express';
import Tag from '../models/Tag';
import logger from '../utils/logger';

// @desc    Get all tags
// @route   GET /api/v1/tags
// @access  Public
export const getTags = async (req: Request, res: Response) => {
  try {
    const tags = await Tag.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tags.length,
      data: tags,
    });
  } catch (error: any) {
    logger.error(`Error in getTags: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error: Could not fetch tags',
    });
  }
};

// @desc    Create a tag
// @route   POST /api/v1/tags
// @access  Private/Admin
export const createTag = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    // Check if tag already exists
    const existingTag = await Tag.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingTag) {
      return res.status(400).json({
        success: false,
        message: 'Tag with this name already exists',
      });
    }

    const tag = await Tag.create({ name });

    res.status(201).json({
      success: true,
      data: tag,
    });
  } catch (error: any) {
    logger.error(`Error in createTag: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error: Could not create tag',
      error: error.message,
    });
  }
};

// @desc    Delete a tag
// @route   DELETE /api/v1/tags/:id
// @access  Private/Admin
export const deleteTag = async (req: Request, res: Response) => {
  try {
    const tag = await Tag.findById(req.params.id);

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found',
      });
    }

    await tag.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Tag deleted successfully',
    });
  } catch (error: any) {
    logger.error(`Error in deleteTag: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error: Could not delete tag',
    });
  }
};
