"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const admin_routes_1 = __importDefault(require("./admin.routes"));
const category_routes_1 = __importDefault(require("./category.routes"));
const product_routes_1 = __importDefault(require("./product.routes"));
const test_routes_1 = __importDefault(require("./test.routes"));
const laboratory_routes_1 = __importDefault(require("./laboratory.routes"));
const booking_routes_1 = __importDefault(require("./booking.routes"));
const upload_routes_1 = __importDefault(require("./upload.routes"));
const payment_routes_1 = __importDefault(require("./payment.routes"));
const lab_portal_routes_1 = __importDefault(require("./lab-portal.routes"));
const router = (0, express_1.Router)();
router.use('/auth', auth_routes_1.default);
router.use('/admin', admin_routes_1.default);
router.use('/lab-portal', lab_portal_routes_1.default);
router.use('/categories', category_routes_1.default);
router.use('/products', product_routes_1.default);
router.use('/tests', test_routes_1.default);
router.use('/labs', laboratory_routes_1.default);
router.use('/bookings', booking_routes_1.default);
router.use('/booking', booking_routes_1.default); // To satisfy the GET /booking/:id request if they strictly use the singular path as well
router.use('/upload', upload_routes_1.default);
router.use('/payment', payment_routes_1.default);
exports.default = router;
