"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const platformSettings_controller_1 = require("../controllers/platformSettings.controller");
const laboratory_controller_1 = require("../controllers/laboratory.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Protect all admin routes
router.use(auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware);
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
router.get('/users', admin_controller_1.getUsers);
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
router.get('/user/:id', admin_controller_1.getUserById);
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
router.post('/user', admin_controller_1.createUser);
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
router.get('/user/:id/detailed', admin_controller_1.getUserDetailedProfile);
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
router.patch('/user/status', admin_controller_1.updateUserStatus);
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
router.post('/lab', laboratory_controller_1.createLab);
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
router.get('/labs', laboratory_controller_1.getLabs);
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
router.get('/lab/:id', laboratory_controller_1.getLabById);
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
router.patch('/lab/:id', laboratory_controller_1.updateLab);
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
router.delete('/lab/:id', laboratory_controller_1.deleteLab);
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
router.get('/bookings', admin_controller_1.getAdminBookings);
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
router.patch('/booking/:id/status', admin_controller_1.updateAdminBookingStatus);
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
router.patch('/booking/:id/assign-lab', admin_controller_1.assignLabToBooking);
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
router.patch('/booking/:id/collection', admin_controller_1.updateCollectionDetails);
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
router.patch('/booking/:id/reject', admin_controller_1.rejectBooking);
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
router.patch('/booking/:id/approve-result', admin_controller_1.approveBookingResult);
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
router.patch('/booking/:id/report', admin_controller_1.updateBookingReport);
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
router.patch('/booking/:id/reject-result', admin_controller_1.rejectBookingResult);
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
router.get('/stats', admin_controller_1.getAdminStats);
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
router.get('/payments', admin_controller_1.getAdminPayments);
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
router.get('/analytics', admin_controller_1.getAdminAnalytics);
// Approvals (Tests & Packages)
router.get('/pending-approvals', admin_controller_1.getPendingApprovals);
router.patch('/test/:id/approve', admin_controller_1.approveTest);
router.patch('/test/:id/reject', admin_controller_1.rejectTest);
router.patch('/package/:id/approve', admin_controller_1.approvePackage);
router.patch('/package/:id/reject', admin_controller_1.rejectPackage);
router.get('/settings', platformSettings_controller_1.getAdminSettings);
router.put('/settings', platformSettings_controller_1.updateAdminSettings);
exports.default = router;
