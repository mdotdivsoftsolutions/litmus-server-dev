import { Request, Response } from 'express';
import Category from '../models/Category';
import Test from '../models/Test';
import Package from '../models/Package';

let cachedCategories: any[] | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 120 * 1000; // 2 minutes in-memory cache

export const invalidateCategoryCache = (): void => {
  cachedCategories = null;
  cacheExpiry = 0;
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const category = await Category.create(req.body);
    invalidateCategoryCache();
    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Failed to create category',
      error: error.message,
    });
  }
};

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const now = Date.now();
    if (cachedCategories && now < cacheExpiry) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      res.status(200).json({
        success: true,
        count: cachedCategories.length,
        data: cachedCategories,
      });
      return;
    }

    const [categories, applicableToAllCount, categoryCounts, packageCounts] = await Promise.all([
      Category.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).lean(),
      Test.countDocuments({ isApplicableToAll: true, isDeleted: { $ne: true } }),
      Test.aggregate([
        { $match: { isApplicableToAll: { $ne: true }, isDeleted: { $ne: true } } },
        { $unwind: '$applicableCategories' },
        { $group: { _id: '$applicableCategories', count: { $sum: 1 } } }
      ]),
      Package.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$categoryId', count: { $sum: 1 } } }
      ])
    ]);

    const countMap = new Map<string, number>();
    categoryCounts.forEach((c: any) => {
      if (c._id) {
        countMap.set(c._id.toString(), c.count);
      }
    });

    const packageCountMap = new Map<string, number>();
    packageCounts.forEach((p: any) => {
      if (p._id) {
        packageCountMap.set(p._id.toString(), p.count);
      }
    });

    const categoriesWithCount = categories.map((cat: any) => {
      const catId = cat._id.toString();
      const isGeneral = cat.name && cat.name.trim().toLowerCase() === 'general';
      const specificCount = countMap.get(catId) || 0;
      const packageCount = packageCountMap.get(catId) || 0;
      const totalTestCount = isGeneral ? 0 : (applicableToAllCount + specificCount);
      return {
        ...cat,
        testCount: totalTestCount,
        packageCount,
        productCount: isGeneral ? packageCount : totalTestCount,
      };
    });

    cachedCategories = categoriesWithCount;
    cacheExpiry = now + CACHE_TTL_MS;

    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.status(200).json({
      success: true,
      count: categoriesWithCount.length,
      data: categoriesWithCount,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message,
    });
  }
};

export const getCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const category = await Category.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Category not found',
      });
      return;
    }
    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category',
      error: error.message,
    });
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Category not found',
      });
      return;
    }

    invalidateCategoryCache();
    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Failed to update category',
      error: error.message,
    });
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );

    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Category not found',
      });
      return;
    }

    invalidateCategoryCache();
    res.status(200).json({
      success: true,
      data: {},
      message: 'Category deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: error.message,
    });
  }
};

export const bulkDeleteCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Please provide an array of category IDs to delete',
      });
      return;
    }

    const result = await Category.updateMany(
      { _id: { $in: ids } },
      { $set: { isDeleted: true } }
    );

    invalidateCategoryCache();
    res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.modifiedCount} category(s)`,
      data: { modifiedCount: result.modifiedCount },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to bulk delete categories',
      error: error.message,
    });
  }
};

export const addSubcategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, imageUrl } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Subcategory name is required' });
      return;
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }

    const trimmedName = name.trim();
    const existing = (category.subcategories || []).some(
      (s: any) => s.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (existing) {
      res.status(400).json({ success: false, message: 'Subcategory already exists in this category' });
      return;
    }

    category.subcategories = category.subcategories || [];
    category.subcategories.push({
      name: trimmedName,
      slug: trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: description?.trim(),
      imageUrl: imageUrl?.trim(),
    });

    await category.save();
    invalidateCategoryCache();

    res.status(200).json({
      success: true,
      data: category,
      message: 'Subcategory added successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Failed to add subcategory',
      error: error.message,
    });
  }
};

export const updateSubcategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, imageUrl } = req.body;
    const category = await Category.findById(req.params.id);
    if (!category) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }

    const subId = req.params.subId;
    const sub = (category.subcategories || []).find(
      (s: any) => String(s._id) === String(subId) || s.name === subId
    );

    if (!sub) {
      res.status(404).json({ success: false, message: 'Subcategory not found' });
      return;
    }

    if (name && name.trim()) {
      sub.name = name.trim();
      sub.slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
    if (description !== undefined) sub.description = description?.trim();
    if (imageUrl !== undefined) sub.imageUrl = imageUrl?.trim();

    await category.save();
    invalidateCategoryCache();

    res.status(200).json({
      success: true,
      data: category,
      message: 'Subcategory updated successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Failed to update subcategory',
      error: error.message,
    });
  }
};

export const deleteSubcategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }

    const subId = req.params.subId;
    category.subcategories = (category.subcategories || []).filter(
      (s: any) => String(s._id) !== String(subId) && s.name !== subId
    );

    await category.save();
    invalidateCategoryCache();

    res.status(200).json({
      success: true,
      data: category,
      message: 'Subcategory removed successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Failed to remove subcategory',
      error: error.message,
    });
  }
};


