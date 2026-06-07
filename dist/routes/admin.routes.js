"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const laboratory_controller_1 = require("../controllers/laboratory.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Protect all admin routes
router.use(auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware);
// User Management
router.get('/users', admin_controller_1.getUsers);
router.get('/user/:id', admin_controller_1.getUserById);
router.patch('/user/status', admin_controller_1.updateUserStatus);
// Lab Management
router.post('/lab', laboratory_controller_1.createLab);
router.get('/labs', laboratory_controller_1.getLabs);
router.patch('/lab/:id', laboratory_controller_1.updateLab);
router.delete('/lab/:id', laboratory_controller_1.deleteLab);
// Booking Management
router.get('/bookings', admin_controller_1.getAdminBookings);
router.patch('/booking/:id/approve-result', admin_controller_1.approveBookingResult);
// Stats & Payments
router.get('/stats', admin_controller_1.getAdminStats);
router.get('/payments', admin_controller_1.getAdminPayments);
exports.default = router;
