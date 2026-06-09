import { Router } from 'express';
import { createCategory, getCategories, getCategory, updateCategory, deleteCategory } from '../controllers/category.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Public route
/**
 * @swagger
 * /api/v1/category:
 *   get:
 *     summary: Get all categories
 *     tags: [Category]
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/', getCategories);

/**
 * @swagger
 * /api/v1/category/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Category]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category details
 */
router.get('/:id', getCategory);

// Protected routes (Admin only)
router.use(authMiddleware, adminMiddleware);

/**
 * @swagger
 * /api/v1/category:
 *   post:
 *     summary: Create a new category (Admin only)
 *     tags: [Category]
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
 *         description: Category created successfully
 */
router.post('/', createCategory);

/**
 * @swagger
 * /api/v1/category/{id}:
 *   patch:
 *     summary: Update a category (Admin only)
 *     tags: [Category]
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
 *         description: Category updated successfully
 */
router.patch('/:id', updateCategory);

/**
 * @swagger
 * /api/v1/category/{id}:
 *   delete:
 *     summary: Delete a category (Admin only)
 *     tags: [Category]
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
 *         description: Category deleted successfully
 */
router.delete('/:id', deleteCategory);

export default router;
