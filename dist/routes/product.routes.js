"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_controller_1 = require("../controllers/product.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Public route
router.get('/', product_controller_1.getProducts);
router.get('/:id', product_controller_1.getProductById);
// Protected routes (Admin only)
router.use(auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware);
router.post('/', product_controller_1.createProduct);
router.patch('/:id', product_controller_1.updateProduct);
router.delete('/:id', product_controller_1.deleteProduct);
exports.default = router;
