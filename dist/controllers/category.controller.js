"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategory = exports.updateCategory = exports.getCategory = exports.getCategories = exports.createCategory = void 0;
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
                    testCount: { $size: '$tests' }
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
