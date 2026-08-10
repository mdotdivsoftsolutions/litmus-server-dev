import { Router } from 'express';
import { getOptions, createOption, deleteOption } from '../controllers/systemOption.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Protect all options routes
router.use(authMiddleware, adminMiddleware);

/**
 * @swagger
 * /api/v1/options:
 *   get:
 *     summary: Get system options (Designations, Departments)
 *     tags: [Options]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category (e.g., DEPARTMENT, DESIGNATION)
 *     responses:
 *       200:
 *         description: List of options
 */
router.get('/', getOptions);

/**
 * @swagger
 * /api/v1/options:
 *   post:
 *     summary: Create a new system option
 *     tags: [Options]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               category:
 *                 type: string
 *               value:
 *                 type: string
 *     responses:
 *       201:
 *         description: Option created
 */
router.post('/', createOption);

/**
 * @swagger
 * /api/v1/options/{id}:
 *   delete:
 *     summary: Delete a system option
 *     tags: [Options]
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
 *         description: Option deleted
 */
router.delete('/:id', deleteOption);

export default router;
