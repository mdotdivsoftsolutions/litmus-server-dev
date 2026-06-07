"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const booking_controller_1 = require("../controllers/booking.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Protect all user booking routes
router.use(auth_middleware_1.authMiddleware);
router.post('/', booking_controller_1.createBooking);
router.get('/my', booking_controller_1.getMyBookings);
router.get('/:id', booking_controller_1.getBookingById);
exports.default = router;
