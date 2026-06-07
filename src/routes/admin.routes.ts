import { Router } from 'express';
import { getUsers, getUserById, updateUserStatus, getAdminBookings, approveBookingResult, getAdminStats, getAdminPayments } from '../controllers/admin.controller';
import { createLab, getLabs, getLabById, updateLab, deleteLab } from '../controllers/laboratory.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Protect all admin routes
router.use(authMiddleware, adminMiddleware);

// User Management
router.get('/users', getUsers);
router.get('/user/:id', getUserById);
router.patch('/user/status', updateUserStatus);

// Lab Management
router.post('/lab', createLab);
router.get('/labs', getLabs);
router.get('/lab/:id', getLabById);
router.patch('/lab/:id', updateLab);
router.delete('/lab/:id', deleteLab);

// Booking Management
router.get('/bookings', getAdminBookings);
router.patch('/booking/:id/approve-result', approveBookingResult);

// Stats & Payments
router.get('/stats', getAdminStats);
router.get('/payments', getAdminPayments);

export default router;
