import { Router } from 'express';
import { createTest, getTests, getTestById, updateTest, deleteTest } from '../controllers/test.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Public route
/**
 * @swagger
 * /api/v1/test:
 *   get:
 *     summary: Get all tests
 *     tags: [Test]
 *     responses:
 *       200:
 *         description: List of tests
 */
router.get('/', getTests);

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
router.get('/:id', getTestById);

// Protected routes (Admin only)
router.use(authMiddleware, adminMiddleware);

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
router.post('/', createTest);

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
router.patch('/:id', updateTest);

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
router.delete('/:id', deleteTest);

export default router;
