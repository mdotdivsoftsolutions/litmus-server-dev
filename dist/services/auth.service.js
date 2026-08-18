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
        const payload = {
            id: user._id.toString(),
            role: user.role,
            permissions: user.permissions,
            labId: user.labId ? user.labId.toString() : undefined
        };
        const accessToken = jsonwebtoken_1.default.sign(payload, process.env.JWT_ACCESS_SECRET, {
            expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m'),
        });
        const refreshToken = jsonwebtoken_1.default.sign(payload, process.env.JWT_REFRESH_SECRET, {
            expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d'),
        });
        return { accessToken, refreshToken };
    }
    static async checkAvailability(email, phone) {
        if (email && email.trim()) {
            const existingEmail = await User_1.default.findOne({ email: email.toLowerCase().trim() });
            if (existingEmail) {
                return { available: false, field: 'email', message: 'Email is already registered. Please login instead.' };
            }
        }
        if (phone && phone.trim()) {
            const existingPhone = await User_1.default.findOne({ phone: phone.trim() });
            if (existingPhone) {
                return { available: false, field: 'phone', message: 'Mobile number is already registered. Please use a different number.' };
            }
        }
        return { available: true, message: 'Available' };
    }
    static async sendOtp(email, phone) {
        const existingUser = await User_1.default.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
            throw new Error('Email is already registered. Please login instead.');
        }
        if (phone && phone.trim()) {
            const existingPhone = await User_1.default.findOne({ phone: phone.trim() });
            if (existingPhone) {
                throw new Error('Mobile number is already registered. Please use a different number.');
            }
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
        // Clear old OTPs for this email
        await OTP_1.default.deleteMany({ email: email.toLowerCase().trim() });
        // Save new OTP
        await OTP_1.default.create({ email: email.toLowerCase().trim(), otp });
        // Send email
        await (0, mailer_1.sendOtpEmail)(email.toLowerCase().trim(), otp);
        return { success: true, message: 'OTP sent successfully' };
    }
    static async register(data) {
        const existingUser = await User_1.default.findOne({ $or: [{ email: data.email }, { phone: data.phone }] });
        if (existingUser) {
            if (existingUser.email === data.email) {
                throw new Error('Email already registered');
            }
            if (existingUser.phone === data.phone) {
                throw new Error('Mobile number is already registered');
            }
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
            permissions: user.permissions,
            labId: user.labId,
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
        user.lastLoginAt = new Date();
        await user.save();
        const { accessToken, refreshToken } = this.generateTokens(user);
        const userResponse = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            permissions: user.permissions,
            labId: user.labId,
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
            user.lastLoginAt = new Date();
            await user.save();
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
    static async verifyOtp(data) {
        const user = await User_1.default.findOne({ email: data.email });
        if (!user) {
            throw new Error('User not found');
        }
        const otpRecord = await OTP_1.default.findOne({ email: data.email, otp: data.otp });
        if (!otpRecord) {
            throw new Error('Invalid or expired OTP');
        }
        return { success: true, message: 'OTP verified successfully' };
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
