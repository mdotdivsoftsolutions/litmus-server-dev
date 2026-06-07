"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const laboratory_controller_1 = require("../controllers/laboratory.controller");
const router = (0, express_1.Router)();
// Public route for users to list and search labs by location
router.get('/', laboratory_controller_1.getLabsPublic);
router.get('/:id', laboratory_controller_1.getLabByIdPublic);
const laboratory_controller_2 = require("../controllers/laboratory.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const types_1 = require("../types");
router.patch('/booking/:bookingId/result', auth_middleware_1.authMiddleware, (0, auth_middleware_1.roleMiddleware)([types_1.UserRole.LAB, types_1.UserRole.ADMIN]), laboratory_controller_2.submitBookingResult);
exports.default = router;
