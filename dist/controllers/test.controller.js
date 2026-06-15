"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTest = exports.updateTest = exports.getTestById = exports.getTests = exports.createTest = void 0;
const Test_1 = __importDefault(require("../models/Test"));
const createTest = async (req, res) => {
    try {
        const test = await Test_1.default.create(req.body);
        res.status(201).json({
            success: true,
            data: test,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Failed to create test',
            error: error.message,
        });
    }
};
exports.createTest = createTest;
const getTests = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 0; // 0 means no limit
        const query = {};
        if (req.query.isPopular === 'true') {
            query.isPopular = true;
        }
        else if (req.query.isPopular === 'false') {
            query.isPopular = false;
        }
        if (req.query.category) {
            query.$or = [
                { applicableCategories: req.query.category },
                { isApplicableToAll: true }
            ];
        }
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            if (query.$or) {
                query.$and = [
                    { $or: query.$or },
                    { $or: [{ testName: searchRegex }, { parameters: searchRegex }] }
                ];
                delete query.$or;
            }
            else {
                query.$or = [
                    { testName: searchRegex },
                    { parameters: searchRegex }
                ];
            }
        }
        const skip = (page - 1) * (limit || 10);
        const testQuery = Test_1.default.find(query)
            .populate('applicableCategories', 'name')
            .populate('labId', 'labName');
        if (limit > 0) {
            testQuery.skip(skip).limit(limit);
        }
        const tests = await testQuery;
        const total = await Test_1.default.countDocuments(query);
        res.status(200).json({
            success: true,
            count: tests.length,
            total,
            page,
            pages: limit > 0 ? Math.ceil(total / limit) : 1,
            data: tests,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tests',
            error: error.message,
        });
    }
};
exports.getTests = getTests;
const getTestById = async (req, res) => {
    try {
        const test = await Test_1.default.findById(req.params.id)
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch test',
            error: error.message,
        });
    }
};
exports.getTestById = getTestById;
const updateTest = async (req, res) => {
    try {
        const test = await Test_1.default.findByIdAndUpdate(req.params.id, req.body, {
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
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Failed to update test',
            error: error.message,
        });
    }
};
exports.updateTest = updateTest;
const deleteTest = async (req, res) => {
    try {
        const test = await Test_1.default.findByIdAndDelete(req.params.id);
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete test',
            error: error.message,
        });
    }
};
exports.deleteTest = deleteTest;
