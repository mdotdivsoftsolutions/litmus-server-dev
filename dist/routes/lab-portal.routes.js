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
 * /api/v1/lab-portal/bookings/{id}/status:
 *   patch:
 *     summary: Update booking status
 *     tags: [Lab Portal]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Booking status updated successfully
 */
router.patch('/bookings/:id/status', lab_portal_controller_1.updateBookingStatus);
/**
 * @swagger
 * /api/v1/lab-portal/profile:
 *   get:
 *     summary: Get lab profile
 *     tags: [Lab Portal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lab profile data
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
router.get('/profile', lab_portal_controller_1.getMyLabProfile);
router.patch('/profile', lab_portal_controller_1.updateMyLabProfile);
/**
 * @swagger
 * /api/v1/lab-portal/bookings/{id}/collection:
 *   patch:
 *     summary: Update collection details (Lab Portal)
 *     tags: [Lab Portal]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *               collector:
 *                 type: string
 *     responses:
 *       200:
 *         description: Collection details updated successfully
 */
router.patch('/bookings/:id/collection', lab_portal_controller_1.updateCollectionDetails);
// Test management
router.get('/platform-tests', lab_portal_controller_1.getPlatformTests);
router.post('/tests/add-existing', lab_portal_controller_1.addExistingTestToLab);
router.get('/tests', lab_portal_controller_1.getMyLabTests);
router.post('/tests', lab_portal_controller_1.createMyLabTest);
router.put('/tests/:id', lab_portal_controller_1.updateMyLabTest);
// Package management
router.get('/packages', lab_portal_controller_1.getMyLabPackages);
router.post('/packages', lab_portal_controller_1.createMyLabPackage);
router.put('/packages/:id', lab_portal_controller_1.updateMyLabPackage);
exports.default = router;
