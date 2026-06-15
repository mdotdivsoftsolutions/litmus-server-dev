"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const lab_portal_controller_1 = require("../controllers/lab-portal.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const types_1 = require("../types");
const router = (0, express_1.Router)();
// Protect all lab portal routes
router.use(auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleMiddleware)([types_1.UserRole.LAB]));
/**
 * @swagger
 * /api/v1/lab-portal/stats:
 *   get:
 *     summary: Get lab dashboard statistics
 *     tags: [Lab Portal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lab statistics
 */
router.get('/stats', lab_portal_controller_1.getLabDashboardStats);
/**
 * @swagger
 * /api/v1/lab-portal/bookings:
 *   get:
 *     summary: Get all bookings for the lab
 *     tags: [Lab Portal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of lab bookings
 */
router.get('/bookings', lab_portal_controller_1.getMyLabBookings);
/**
 * @swagger
 * /api/v1/lab-portal/profile:
 *   patch:
 *     summary: Update lab profile
 *     tags: [Lab Portal]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Lab profile updated successfully
 */
router.patch('/profile', lab_portal_controller_1.updateMyLabProfile);
exports.default = router;
