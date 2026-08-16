import { Router } from 'express';
import { createBooking, getMyBookings, getBookingById, updateCourierTracking, downloadBookingReport } from '../controllers/booking.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Protect all user booking routes
router.use(authMiddleware);

/**
 * @swagger
 * /api/v1/booking:
 *   post:
 *     summary: Create a new booking
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Booking created successfully
 */
router.post('/', createBooking);

/**
 * @swagger
 * /api/v1/booking/my:
 *   get:
 *     summary: Get my bookings
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of my bookings
 */
router.get('/my', getMyBookings);

router.patch('/:id/courier-tracking', updateCourierTracking);
router.get('/:id/report', downloadBookingReport);

/**
 * @swagger
 * /api/v1/booking/{id}:
 *   get:
 *     summary: Get a specific booking by ID
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking details
 */
router.get('/:id', getBookingById);

export default router;
