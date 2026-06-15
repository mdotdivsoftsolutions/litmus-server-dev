"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const OTP_1 = __importDefault(require("../models/OTP"));
const mailer_1 = require("../utils/mailer");
class AuthService {
    static generateTokens(user) {
        const payload = { id: user._id.toString(), role: user.role };
        const accessToken = jsonwebtoken_1.default.sign(payload, process.env.JWT_ACCESS_SECRET, {
            expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m'),
        });
        const refreshToken = jsonwebtoken_1.default.sign(payload, process.env.JWT_REFRESH_SECRET, {
            expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d'),
        });
        return { accessToken, refreshToken };
    }
    static async sendOtp(email) {
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            throw new Error('Email already registered');
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
        // Clear old OTPs for this email
        await OTP_1.default.deleteMany({ email });
        // Save new OTP
        await OTP_1.default.create({ email, otp });
        // Send email
        await (0, mailer_1.sendOtpEmail)(email, otp);
        return { success: true, message: 'OTP sent successfully' };
    }
    static async register(data) {
        const existingUser = await User_1.default.findOne({ email: data.email });
        if (existingUser) {
            throw new Error('Email already registered');
        }
        const otpRecord = await OTP_1.default.findOne({ email: data.email, otp: data.otp });
        if (!otpRecord) {
            throw new Error('Invalid or expired OTP');
        }
        const user = await User_1.default.create(data);
        await OTP_1.default.deleteOne({ _id: otpRecord._id }); // Clear OTP after success
        const { accessToken, refreshToken } = this.generateTokens(user);
        // Don't send password back
        const userResponse = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
        };
        return { user: userResponse, accessToken, refreshToken };
    }
    static async login(data) {
        const user = await User_1.default.findOne({ email: data.email }).select('+password');
        if (!user) {
            throw new Error('Invalid credentials');
        }
        if (user.isActive === false) {
            throw new Error('ACCOUNT_BLOCKED');
        }
        const isMatch = await user.comparePassword(data.password);
        if (!isMatch) {
            throw new Error('Invalid credentials');
        }
        const { accessToken, refreshToken } = this.generateTokens(user);
        const userResponse = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
        };
        return { user: userResponse, accessToken, refreshToken };
    }
    static async refreshToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_REFRESH_SECRET);
            const user = await User_1.default.findById(decoded.id);
            if (!user || !user.isActive) {
                throw new Error('User not found or inactive');
            }
            const { accessToken, refreshToken } = this.generateTokens(user);
            return { accessToken, refreshToken };
        }
        catch (error) {
            throw new Error('Invalid refresh token');
        }
    }
    static async forgotPassword(email) {
        const user = await User_1.default.findOne({ email });
        if (!user) {
            throw new Error('User not found');
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
        // Clear old OTPs for this email
        await OTP_1.default.deleteMany({ email });
        // Save new OTP
        await OTP_1.default.create({ email, otp });
        // Send email
        await (0, mailer_1.sendOtpEmail)(email, otp);
        return { success: true, message: 'Password reset OTP sent successfully' };
    }
    static async resetPassword(data) {
        const user = await User_1.default.findOne({ email: data.email });
        if (!user) {
            throw new Error('User not found');
        }
        const otpRecord = await OTP_1.default.findOne({ email: data.email, otp: data.otp });
        if (!otpRecord) {
            throw new Error('Invalid or expired OTP');
        }
        user.password = data.newPassword;
        await user.save();
        await OTP_1.default.deleteOne({ _id: otpRecord._id });
        return { success: true, message: 'Password reset successfully' };
    }
}
exports.AuthService = AuthService;
