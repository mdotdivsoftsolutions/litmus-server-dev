"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const test_controller_1 = require("../controllers/test.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Public route
router.get('/', test_controller_1.getTests);
router.get('/:id', test_controller_1.getTestById);
// Protected routes (Admin only)
router.use(auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware);
router.post('/', test_controller_1.createTest);
router.patch('/:id', test_controller_1.updateTest);
router.delete('/:id', test_controller_1.deleteTest);
exports.default = router;
