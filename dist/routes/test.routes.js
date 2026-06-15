"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const test_controller_1 = require("../controllers/test.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Public route
/**
 * @swagger
 * /api/v1/test:
 *   get:
 *     summary: Get all tests
 *     tags: [Test]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: isPopular
 *         schema:
 *           type: boolean
 *         description: Filter by popular tests
 *     responses:
 *       200:
 *         description: List of tests
 */
router.get('/', test_controller_1.getTests);
/**
 * @swagger
 * /api/v1/test/{id}:
 *   get:
 *     summary: Get test by ID
 *     tags: [Test]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Test details
 */
router.get('/:id', test_controller_1.getTestById);
// Protected routes (Admin only)
router.use(auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware);
/**
 * @swagger
 * /api/v1/test:
 *   post:
 *     summary: Create a new test (Admin only)
 *     tags: [Test]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Test created successfully
 */
router.post('/', test_controller_1.createTest);
/**
 * @swagger
 * /api/v1/test/{id}:
 *   patch:
 *     summary: Update a test (Admin only)
 *     tags: [Test]
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
 *         description: Test updated successfully
 */
router.patch('/:id', test_controller_1.updateTest);
/**
 * @swagger
 * /api/v1/test/{id}:
 *   delete:
 *     summary: Delete a test (Admin only)
 *     tags: [Test]
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
 *         description: Test deleted successfully
 */
router.delete('/:id', test_controller_1.deleteTest);
exports.default = router;
