"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const laboratory_controller_1 = require("../controllers/laboratory.controller");
const router = (0, express_1.Router)();
// Public route for users to list and search labs by location
/**
 * @swagger
 * /api/v1/laboratory:
 *   get:
 *     summary: Get all laboratories (public)
 *     description: Returns a list of active (isActive=true) laboratories.
 *     tags: [Laboratory]
 *     parameters:
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Search by location text
 *       - in: query
 *         name: isTrusted
 *         schema:
 *           type: boolean
 *         description: Filter trusted laboratories
 *     responses:
 *       200:
 *         description: List of laboratories
 */
router.get('/', laboratory_controller_1.getLabsPublic);
/**
 * @swagger
 * /api/v1/laboratory/{id}:
 *   get:
 *     summary: Get laboratory by ID (public)
 *     tags: [Laboratory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Laboratory details
 *       404:
 *         description: Laboratory not found or inactive
 */
router.get('/:id', laboratory_controller_1.getLabByIdPublic);
/**
 * @swagger
 * /api/v1/laboratory/{id}/availability:
 *   get:
 *     summary: Check laboratory availability for a given date (public)
 *     tags: [Laboratory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Laboratory availability status
 */
router.get('/:id/availability', require('../controllers/laboratory.controller').getLabAvailability);
const laboratory_controller_2 = require("../controllers/laboratory.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const types_1 = require("../types");
/**
 * @swagger
 * /api/v1/laboratory/booking/{bookingId}/result:
 *   patch:
 *     summary: Submit a booking result (Lab/Admin only)
 *     tags: [Laboratory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Result submitted successfully
 */
router.patch('/booking/:bookingId/result', auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleMiddleware)([types_1.UserRole.LAB, types_1.UserRole.ADMIN]), laboratory_controller_2.submitBookingResult);
exports.default = router;
