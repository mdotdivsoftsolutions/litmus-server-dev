"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const category_controller_1 = require("../controllers/category.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Public route
router.get('/', category_controller_1.getCategories);
// Protected routes (Admin only)
router.use(auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware);
router.post('/', category_controller_1.createCategory);
router.patch('/:id', category_controller_1.updateCategory);
router.delete('/:id', category_controller_1.deleteCategory);
exports.default = router;
