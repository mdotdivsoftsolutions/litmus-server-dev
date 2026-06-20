import { Router } from 'express';
import { getLabDashboardStats, getMyLabBookings, updateMyLabProfile, updateBookingStatus, updateCollectionDetails } from '../controllers/lab-portal.controller';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';
import { UserRole } from '../types';

const router = Router();

// Protect all lab portal routes
router.use(authMiddleware, roleMiddleware([UserRole.LAB]));

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
router.get('/stats', getLabDashboardStats);

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
router.get('/bookings', getMyLabBookings);

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
router.patch('/bookings/:id/status', updateBookingStatus);

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
router.patch('/profile', updateMyLabProfile);

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
router.patch('/bookings/:id/collection', updateCollectionDetails);

export default router;
