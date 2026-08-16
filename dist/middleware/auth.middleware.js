"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissionMiddleware = exports.labOwnerMiddleware = exports.labMiddleware = exports.adminMiddleware = exports.roleMiddleware = exports.optionalAuthMiddleware = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const types_1 = require("../types");
const authMiddleware = (req, res, next) => {
    let token;
    // 1. Check Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }
    // 2. Fallback to HttpOnly cookie
    else if (req.cookies && req.cookies.accessToken) {
        token = req.cookies.accessToken;
    }
    if (!token) {
        res.status(401).json({ success: false, message: 'Not authorized to access this route' });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_ACCESS_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(401).json({ success: false, message: 'Invalid or expired token' });
        return;
    }
};
exports.authMiddleware = authMiddleware;
const optionalAuthMiddleware = (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }
    else if (req.cookies && req.cookies.accessToken) {
        token = req.cookies.accessToken;
    }
    if (token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_ACCESS_SECRET);
            req.user = decoded;
        }
        catch (error) {
            // Token invalid or expired, just ignore for optional auth
        }
    }
    next();
};
exports.optionalAuthMiddleware = optionalAuthMiddleware;
const roleMiddleware = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({ success: false, message: 'Forbidden: Insufficient permissions' });
            return;
        }
        next();
    };
};
exports.roleMiddleware = roleMiddleware;
// Ready-to-use role middlewares
exports.adminMiddleware = (0, exports.roleMiddleware)([types_1.UserRole.ADMIN, types_1.UserRole.EMPLOYEE]);
exports.labMiddleware = (0, exports.roleMiddleware)([types_1.UserRole.LAB, types_1.UserRole.LAB_EMPLOYEE, types_1.UserRole.ADMIN]);
exports.labOwnerMiddleware = (0, exports.roleMiddleware)([types_1.UserRole.LAB, types_1.UserRole.ADMIN]);
const permissionMiddleware = (requiredPermissions) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Not authorized' });
            return;
        }
        if (req.user.role === types_1.UserRole.ADMIN || req.user.role === types_1.UserRole.LAB) {
            // Lab owners have all lab permissions, Admins have all permissions
            next();
            return;
        }
        if (req.user.role === types_1.UserRole.EMPLOYEE || req.user.role === types_1.UserRole.LAB_EMPLOYEE) {
            const hasPermission = requiredPermissions.every(p => req.user?.permissions?.includes(p));
            if (hasPermission) {
                next();
                return;
            }
        }
        res.status(403).json({ success: false, message: 'Forbidden: Insufficient permissions' });
        return;
    };
};
exports.permissionMiddleware = permissionMiddleware;
