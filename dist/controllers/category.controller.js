"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSubcategory = exports.updateSubcategory = exports.addSubcategory = exports.deleteCategory = exports.updateCategory = exports.getCategory = exports.getCategories = exports.createCategory = void 0;
const Category_1 = __importDefault(require("../models/Category"));
const createCategory = async (req, res) => {
    try {
        const category = await Category_1.default.create(req.body);
        res.status(201).json({
            success: true,
            data: category,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Failed to create category',
            error: error.message,
        });
    }
};
exports.createCategory = createCategory;
const getCategories = async (req, res) => {
    try {
        const categories = await Category_1.default.aggregate([
            {
                $lookup: {
                    from: 'tests',
                    let: { categoryId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        { $eq: ['$isApplicableToAll', true] },
                                        { $in: ['$$categoryId', { $ifNull: ['$applicableCategories', []] }] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'tests'
                }
            },
            {
                $addFields: {
                    testCount: { $size: '$tests' },
                    productCount: { $size: '$tests' }
                }
            },
            {
                $project: {
                    tests: 0
                }
            }
        ]);
        res.status(200).json({
            success: true,
            count: categories.length,
            data: categories,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories',
            error: error.message,
        });
    }
};
exports.getCategories = getCategories;
const getCategory = async (req, res) => {
    try {
        const category = await Category_1.default.findById(req.params.id);
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch category',
            error: error.message,
        });
    }
};
exports.getCategory = getCategory;
const updateCategory = async (req, res) => {
    try {
        const category = await Category_1.default.findByIdAndUpdate(req.params.id, req.body, {
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
        res.status(200).json({
            success: true,
            data: category,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Failed to update category',
            error: error.message,
        });
    }
};
exports.updateCategory = updateCategory;
const deleteCategory = async (req, res) => {
    try {
        const category = await Category_1.default.findByIdAndDelete(req.params.id);
        if (!category) {
            res.status(404).json({
                success: false,
                message: 'Category not found',
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: {},
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete category',
            error: error.message,
        });
    }
};
exports.deleteCategory = deleteCategory;
const addSubcategory = async (req, res) => {
    try {
        const { name, description, imageUrl } = req.body;
        if (!name || !name.trim()) {
            res.status(400).json({ success: false, message: 'Subcategory name is required' });
            return;
        }
        const category = await Category_1.default.findById(req.params.id);
        if (!category) {
            res.status(404).json({ success: false, message: 'Category not found' });
            return;
        }
        const trimmedName = name.trim();
        const existing = (category.subcategories || []).some((s) => s.name.toLowerCase() === trimmedName.toLowerCase());
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
        res.status(200).json({
            success: true,
            data: category,
            message: 'Subcategory added successfully',
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Failed to add subcategory',
            error: error.message,
        });
    }
};
exports.addSubcategory = addSubcategory;
const updateSubcategory = async (req, res) => {
    try {
        const { name, description, imageUrl } = req.body;
        const category = await Category_1.default.findById(req.params.id);
        if (!category) {
            res.status(404).json({ success: false, message: 'Category not found' });
            return;
        }
        const subId = req.params.subId;
        const sub = (category.subcategories || []).find((s) => String(s._id) === String(subId) || s.name === subId);
        if (!sub) {
            res.status(404).json({ success: false, message: 'Subcategory not found' });
            return;
        }
        if (name && name.trim()) {
            sub.name = name.trim();
            sub.slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
        }
        if (description !== undefined)
            sub.description = description?.trim();
        if (imageUrl !== undefined)
            sub.imageUrl = imageUrl?.trim();
        await category.save();
        res.status(200).json({
            success: true,
            data: category,
            message: 'Subcategory updated successfully',
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Failed to update subcategory',
            error: error.message,
        });
    }
};
exports.updateSubcategory = updateSubcategory;
const deleteSubcategory = async (req, res) => {
    try {
        const category = await Category_1.default.findById(req.params.id);
        if (!category) {
            res.status(404).json({ success: false, message: 'Category not found' });
            return;
        }
        const subId = req.params.subId;
        category.subcategories = (category.subcategories || []).filter((s) => String(s._id) !== String(subId) && s.name !== subId);
        await category.save();
        res.status(200).json({
            success: true,
            data: category,
            message: 'Subcategory removed successfully',
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Failed to remove subcategory',
            error: error.message,
        });
    }
};
exports.deleteSubcategory = deleteSubcategory;
