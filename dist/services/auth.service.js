"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
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
    static async register(data) {
        const existingUser = await User_1.default.findOne({ email: data.email });
        if (existingUser) {
            throw new Error('Email already registered');
        }
        const user = await User_1.default.create(data);
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
}
exports.AuthService = AuthService;
