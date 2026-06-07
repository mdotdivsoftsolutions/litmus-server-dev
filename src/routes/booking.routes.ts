import { Router } from 'express';
import { createBooking, getMyBookings, getBookingById } from '../controllers/booking.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Protect all user booking routes
router.use(authMiddleware);

router.post('/', createBooking);
router.get('/my', getMyBookings);
router.get('/:id', getBookingById);

export default router;
