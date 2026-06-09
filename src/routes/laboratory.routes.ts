import { Router } from 'express';
import { getLabsPublic, getLabByIdPublic } from '../controllers/laboratory.controller';

const router = Router();

// Public route for users to list and search labs by location
/**
 * @swagger
 * /api/v1/laboratory:
 *   get:
 *     summary: Get all laboratories (public)
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
router.get('/', getLabsPublic);

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
 */
router.get('/:id', getLabByIdPublic);

import { submitBookingResult } from '../controllers/laboratory.controller';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';
import { UserRole } from '../types';

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
router.patch('/booking/:bookingId/result', authMiddleware, roleMiddleware([UserRole.LAB, UserRole.ADMIN]), submitBookingResult);

export default router;
