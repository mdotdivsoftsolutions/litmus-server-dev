"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const lab_portal_controller_1 = require("../controllers/lab-portal.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const types_1 = require("../types");
const router = (0, express_1.Router)();
// Protect all lab portal routes
router.use(auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleMiddleware)([types_1.UserRole.LAB]));
router.get('/stats', lab_portal_controller_1.getLabDashboardStats);
router.get('/bookings', lab_portal_controller_1.getMyLabBookings);
router.patch('/profile', lab_portal_controller_1.updateMyLabProfile);
exports.default = router;
