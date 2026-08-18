"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const booking_controller_1 = require("../controllers/booking.controller");
const invoice_controller_1 = require("../controllers/invoice.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Protect all user booking routes
router.use(auth_middleware_1.authMiddleware);
router.get('/:id/invoice/html', invoice_controller_1.renderBookingInvoiceHtml);
router.get('/:id/invoice', invoice_controller_1.getBookingInvoice);
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
router.post('/', booking_controller_1.createBooking);
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
router.get('/my', booking_controller_1.getMyBookings);
router.patch('/:id/courier-tracking', booking_controller_1.updateCourierTracking);
router.get('/:id/report', booking_controller_1.downloadBookingReport);
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
router.get('/:id', booking_controller_1.getBookingById);
exports.default = router;
