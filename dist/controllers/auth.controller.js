"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
const User_1 = __importDefault(require("../models/User"));
const logger_1 = __importDefault(require("../utils/logger"));
class AuthController {
    static async register(req, res) {
        try {
            const { user, accessToken, refreshToken } = await auth_service_1.AuthService.register(req.body);
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });
            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: { user, accessToken },
            });
        }
        catch (error) {
            logger_1.default.error(`Register Error: ${error.message}`);
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async login(req, res) {
        try {
            const { user, accessToken, refreshToken } = await auth_service_1.AuthService.login(req.body);
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });
            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: { user, accessToken },
            });
        }
        catch (error) {
            logger_1.default.error(`Login Error: ${error.message}`);
            res.status(401).json({ success: false, message: error.message });
        }
    }
    static async logout(req, res) {
        res.clearCookie('refreshToken');
        res.status(200).json({ success: true, message: 'Logged out successfully' });
    }
    static async getMe(req, res) {
        try {
            const user = await User_1.default.findById(req.user?.id).select('-password');
            if (!user) {
                res.status(404).json({ success: false, message: 'User not found' });
                return;
            }
            res.status(200).json({ success: true, data: user });
        }
        catch (error) {
            logger_1.default.error(`GetMe Error: ${error.message}`);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
    static async updateProfile(req, res) {
        try {
            // Disallow updating sensitive fields like role or password via this endpoint
            const { role, password, email, ...updateData } = req.body;
            const user = await User_1.default.findByIdAndUpdate(req.user?.id, updateData, { new: true, runValidators: true }).select('-password');
            if (!user) {
                res.status(404).json({ success: false, message: 'User not found' });
                return;
            }
            res.status(200).json({ success: true, message: 'Profile updated successfully', data: user });
        }
        catch (error) {
            logger_1.default.error(`UpdateProfile Error: ${error.message}`);
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async refreshToken(req, res) {
        try {
            const refreshToken = req.cookies.refreshToken;
            if (!refreshToken) {
                res.status(401).json({ success: false, message: 'Refresh token not found' });
                return;
            }
            const { accessToken, refreshToken: newRefreshToken } = await auth_service_1.AuthService.refreshToken(refreshToken);
            res.cookie('refreshToken', newRefreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });
            res.status(200).json({
                success: true,
                data: { accessToken },
            });
        }
        catch (error) {
            logger_1.default.error(`RefreshToken Error: ${error.message}`);
            res.status(401).json({ success: false, message: 'Invalid refresh token' });
        }
    }
}
exports.AuthController = AuthController;
