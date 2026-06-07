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
        const tests = await Test_1.default.find();
        res.status(200).json({
            success: true,
            count: tests.length,
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
        const test = await Test_1.default.findById(req.params.id);
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
