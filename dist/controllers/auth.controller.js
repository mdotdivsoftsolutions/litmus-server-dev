"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
const logger_1 = __importDefault(require("../utils/logger"));
class AuthController {
    static async sendOtp(req, res) {
        try {
            const { email, phone } = req.body;
            const result = await auth_service_1.AuthService.sendOtp(email, phone);
            res.status(200).json(result);
        }
        catch (error) {
            logger_1.default.error(`SendOTP Error: ${error.message}`);
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async checkAvailability(req, res) {
        try {
            const { email, phone } = req.body;
            const result = await auth_service_1.AuthService.checkAvailability(email, phone);
            if (!result.available) {
                res.status(400).json({ success: false, message: result.message, field: result.field });
                return;
            }
            res.status(200).json({ success: true, message: 'Available' });
        }
        catch (error) {
            logger_1.default.error(`CheckAvailability Error: ${error.message}`);
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async forgotPassword(req, res) {
        try {
            const result = await auth_service_1.AuthService.forgotPassword(req.body.email);
            res.status(200).json(result);
        }
        catch (error) {
            logger_1.default.error(`ForgotPassword Error: ${error.message}`);
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async verifyOtp(req, res) {
        try {
            const result = await auth_service_1.AuthService.verifyOtp(req.body);
            res.status(200).json(result);
        }
        catch (error) {
            logger_1.default.error(`VerifyOtp Error: ${error.message}`);
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async resetPassword(req, res) {
        try {
            const result = await auth_service_1.AuthService.resetPassword(req.body);
            res.status(200).json(result);
        }
        catch (error) {
            logger_1.default.error(`ResetPassword Error: ${error.message}`);
            res.status(400).json({ success: false, message: error.message });
        }
    }
    static async register(req, res) {
        try {
            const { user, accessToken, refreshToken } = await auth_service_1.AuthService.register(req.body);
            const isSecure = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
            const sameSiteValue = isSecure ? 'none' : 'lax';
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: isSecure,
                sameSite: sameSiteValue,
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });
            res.cookie('accessToken', accessToken, {
                httpOnly: true,
                secure: isSecure,
                sameSite: sameSiteValue,
                maxAge: 15 * 60 * 1000, // 15 mins
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
            const isSecure = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
            const sameSiteValue = isSecure ? 'none' : 'lax';
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: isSecure,
                sameSite: sameSiteValue,
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });
            res.cookie('accessToken', accessToken, {
                httpOnly: true,
                secure: isSecure,
                sameSite: sameSiteValue,
                maxAge: 15 * 60 * 1000, // 15 mins
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
        const isSecure = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
        const sameSiteValue = isSecure ? 'none' : 'lax';
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: isSecure,
            sameSite: sameSiteValue,
        });
        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: isSecure,
            sameSite: sameSiteValue,
        });
        res.status(200).json({ success: true, message: 'Logged out successfully' });
    }
    static async getMe(req, res) {
        try {
            const user = await auth_service_1.AuthService.getProfile(req.user.id);
            res.status(200).json({ success: true, data: user });
        }
        catch (error) {
            logger_1.default.error(`GetMe Error: ${error.message}`);
            const status = error.message === 'User not found' ? 404 : 500;
            res.status(status).json({ success: false, message: error.message });
        }
    }
    static async updateProfile(req, res) {
        try {
            const user = await auth_service_1.AuthService.updateProfile(req.user.id, req.body);
            res.status(200).json({ success: true, message: 'Profile updated successfully', data: user });
        }
        catch (error) {
            logger_1.default.error(`UpdateProfile Error: ${error.message}`);
            const status = error.message === 'User not found' ? 404 : 400;
            res.status(status).json({ success: false, message: error.message });
        }
    }
    static async changePassword(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;
            const result = await auth_service_1.AuthService.changePassword(req.user.id, currentPassword, newPassword);
            res.status(200).json(result);
        }
        catch (error) {
            logger_1.default.error(`ChangePassword Error: ${error.message}`);
            const status = error.message === 'User not found' ? 404 : (error.message === 'Incorrect current password' ? 401 : 400);
            res.status(status).json({ success: false, message: error.message });
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
            const isSecure = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
            const sameSiteValue = isSecure ? 'none' : 'lax';
            res.cookie('refreshToken', newRefreshToken, {
                httpOnly: true,
                secure: isSecure,
                sameSite: sameSiteValue,
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });
            res.cookie('accessToken', accessToken, {
                httpOnly: true,
                secure: isSecure,
                sameSite: sameSiteValue,
                maxAge: 15 * 60 * 1000, // 15 mins
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
