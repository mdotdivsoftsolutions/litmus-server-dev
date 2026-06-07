import { Router } from 'express';
import { getLabDashboardStats, getMyLabBookings, updateMyLabProfile } from '../controllers/lab-portal.controller';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';
import { UserRole } from '../types';

const router = Router();

// Protect all lab portal routes
router.use(authMiddleware, roleMiddleware([UserRole.LAB]));

router.get('/stats', getLabDashboardStats);
router.get('/bookings', getMyLabBookings);
router.patch('/profile', updateMyLabProfile);

export default router;
