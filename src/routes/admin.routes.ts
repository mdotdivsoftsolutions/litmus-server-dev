import { Router } from 'express';
import { getUsers, getUserById, updateUserStatus, createUser, getUserDetailedProfile, updateAdminUserProfile, addUserAdminNote, getAdminBookings, updateAdminBookingStatus, assignLabToBooking, rejectBooking, approveBookingResult, updateBookingReport, rejectBookingResult, getAdminStats, getAdminPayments, getAdminAnalytics, updateCollectionDetails, getPendingApprovals, approveTest, rejectTest, approvePackage, rejectPackage } from '../controllers/admin.controller';
import { getAdminSettings, updateAdminSettings, testWhatsAppNotification, triggerAbandonedCartScan } from '../controllers/platformSettings.controller';

import { createLab, getLabs, getLabById, updateLab, deleteLab } from '../controllers/laboratory.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Protect all admin routes
router.use(authMiddleware, adminMiddleware);

// User Management
/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/users', getUsers);

/**
 * @swagger
 * /api/v1/admin/user/{id}:
 *   get:
 *     summary: Get user by ID (Admin only)
 *     tags: [Admin]
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
 *         description: User retrieved successfully
 *       404:
 *         description: User not found
 */
router.get('/user/:id', getUserById);

/**
 * @swagger
 * /api/v1/admin/user:
 *   post:
 *     summary: Create a new user (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: User created successfully
 */
router.post('/user', createUser);

/**
 * @swagger
 * /api/v1/admin/user/{id}/detailed:
 *   get:
 *     summary: Get detailed user profile including bookings, payments, and cart (Admin only)
 *     tags: [Admin]
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
 *         description: Detailed user profile retrieved successfully
 */
router.get('/user/:id/detailed', getUserDetailedProfile);
router.put('/user/:id', updateAdminUserProfile);
router.post('/user/:id/notes', addUserAdminNote);

/**
 * @swagger
 * /api/v1/admin/user/status:
 *   patch:
 *     summary: Update user status (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE, BLOCKED]
 *     responses:
 *       200:
 *         description: User status updated successfully
 */
router.patch('/user/status', updateUserStatus);

// Lab Management
/**
 * @swagger
 * /api/v1/admin/lab:
 *   post:
 *     summary: Create a new lab (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               labName:
 *                 type: string
 *               location:
 *                 type: object
 *               expertiseArea:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Max 4 expertise areas
 *               isActive:
 *                 type: boolean
 *                 description: Toggle visibility of the lab to the public
 *     responses:
 *       201:
 *         description: Lab created successfully
 */
router.post('/lab', createLab);

/**
 * @swagger
 * /api/v1/admin/labs:
 *   get:
 *     summary: Get all labs (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of labs
 */
router.get('/labs', getLabs);

/**
 * @swagger
 * /api/v1/admin/lab/{id}:
 *   get:
 *     summary: Get lab by ID (Admin only)
 *     tags: [Admin]
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
 *         description: Lab details
 */
router.get('/lab/:id', getLabById);

/**
 * @swagger
 * /api/v1/admin/lab/{id}:
 *   patch:
 *     summary: Update lab (Admin only)
 *     tags: [Admin]
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
 *               labName:
 *                 type: string
 *               expertiseArea:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *                 description: Visibility toggle
 *     responses:
 *       200:
 *         description: Lab updated successfully
 */
router.patch('/lab/:id', updateLab);

/**
 * @swagger
 * /api/v1/admin/lab/{id}:
 *   delete:
 *     summary: Delete lab (Admin only)
 *     tags: [Admin]
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
 *         description: Lab deleted successfully
 */
router.delete('/lab/:id', deleteLab);

// Booking Management
/**
 * @swagger
 * /api/v1/admin/bookings:
 *   get:
 *     summary: Get all bookings (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all bookings
 */
router.get('/bookings', getAdminBookings);

/**
 * @swagger
 * /api/v1/admin/booking/{id}/status:
 *   patch:
 *     summary: Update booking status, paymentStatus, or labId (Admin only)
 *     tags: [Admin]
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
 *               paymentStatus:
 *                 type: string
 *               labId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Booking updated successfully
 */
router.patch('/booking/:id/status', updateAdminBookingStatus);

/**
 * @swagger
 * /api/v1/admin/booking/{id}/assign-lab:
 *   patch:
 *     summary: Assign a lab to a booking (Admin only)
 *     tags: [Admin]
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
 *               labId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lab assigned successfully
 */
router.patch('/booking/:id/assign-lab', assignLabToBooking);

/**
 * @swagger
 * /api/v1/admin/booking/{id}/collection:
 *   patch:
 *     summary: Update collection details (Admin only)
 *     tags: [Admin]
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
 *         description: Collection details updated
 */
router.patch('/booking/:id/collection', updateCollectionDetails);

/**
 * @swagger
 * /api/v1/admin/booking/{id}/reject:
 *   patch:
 *     summary: Reject a booking entirely (Admin only)
 *     tags: [Admin]
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
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Booking rejected successfully
 */
router.patch('/booking/:id/reject', rejectBooking);

/**
 * @swagger
 * /api/v1/admin/booking/{id}/approve-result:
 *   patch:
 *     summary: Approve a booking result (Admin only)
 *     tags: [Admin]
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
 *         description: Result approved
 */
router.patch('/booking/:id/approve-result', approveBookingResult);

/**
 * @swagger
 * /api/v1/admin/booking/{id}/report:
 *   patch:
 *     summary: Update booking report file and summary/recommendations/tips/notes (Admin only)
 *     tags: [Admin]
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
 *     responses:
 *       200:
 *         description: Report updated successfully
 */
router.patch('/booking/:id/report', updateBookingReport);

/**
 * @swagger
 * /api/v1/admin/booking/{id}/reject-result:
 *   patch:
 *     summary: Reject a booking result (Admin only)
 *     tags: [Admin]
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
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Result rejected
 */
router.patch('/booking/:id/reject-result', rejectBookingResult);

// Stats & Payments
/**
 * @swagger
 * /api/v1/admin/stats:
 *   get:
 *     summary: Get admin dashboard stats (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin statistics
 */
router.get('/stats', getAdminStats);

/**
 * @swagger
 * /api/v1/admin/payments:
 *   get:
 *     summary: Get all payments (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of payments
 */
router.get('/payments', getAdminPayments);

/**
 * @swagger
 * /api/v1/admin/analytics:
 *   get:
 *     summary: Get admin dashboard analytics (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin analytics data
 */
router.get('/analytics', getAdminAnalytics);

// Approvals (Tests & Packages)
router.get('/pending-approvals', getPendingApprovals);
router.patch('/test/:id/approve', approveTest);
router.patch('/test/:id/reject', rejectTest);
router.patch('/package/:id/approve', approvePackage);
router.patch('/package/:id/reject', rejectPackage);

router.get('/settings', getAdminSettings);
router.put('/settings', updateAdminSettings);
router.post('/notifications/test-whatsapp', testWhatsAppNotification);
router.post('/notifications/trigger-abandoned-carts', triggerAbandonedCartScan);

export default router;

