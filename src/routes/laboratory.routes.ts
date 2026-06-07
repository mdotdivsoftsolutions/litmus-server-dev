import { Router } from 'express';
import { getLabsPublic, getLabByIdPublic } from '../controllers/laboratory.controller';

const router = Router();

// Public route for users to list and search labs by location
router.get('/', getLabsPublic);
router.get('/:id', getLabByIdPublic);

import { submitBookingResult } from '../controllers/laboratory.controller';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';
import { UserRole } from '../types';

router.patch('/booking/:bookingId/result', authMiddleware, roleMiddleware([UserRole.LAB, UserRole.ADMIN]), submitBookingResult);

export default router;
