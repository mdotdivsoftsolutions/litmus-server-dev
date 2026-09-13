import { Router } from 'express';
import {
  createPackage,
  getPackages,
  getPackageById,
  updatePackage,
  deletePackage,
  bulkDeletePackages,
} from '../controllers/package.controller';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';
import { UserRole } from '../types';

const router = Router();

// Public routes
/**
 * @swagger
 * /api/v1/packages:
 *   get:
 *     summary: Get all packages
 *     tags: [Package]
 *     responses:
 *       200:
 *         description: List of packages
 */
router.route('/').get(getPackages);

/**
 * @swagger
 * /api/v1/packages/{id}:
 *   get:
 *     summary: Get package by ID
 *     tags: [Package]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Package details
 */
router.route('/:id').get(getPackageById);

// Protected routes (Admin and Lab only)
router.use(authMiddleware);
router.use(roleMiddleware([UserRole.ADMIN, UserRole.LAB]));

/**
 * @swagger
 * /api/v1/packages:
 *   post:
 *     summary: Create a package (Admin or Lab)
 *     tags: [Package]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Package created successfully
 */
router.route('/').post(createPackage);

/**
 * @swagger
 * /api/v1/packages/bulk-delete:
 *   post:
 *     summary: Bulk soft delete packages (Admin or Lab)
 *     tags: [Package]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Packages deleted successfully
 */
router.route('/bulk-delete').post(bulkDeletePackages);

/**
 * @swagger
 * /api/v1/packages/{id}:
 *   put:
 *     summary: Update a package (Admin or Lab)
 *     tags: [Package]
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
 *         description: Package updated successfully
 *   delete:
 *     summary: Delete a package (Admin or Lab)
 *     tags: [Package]
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
 *         description: Package deleted successfully
 */
router.route('/:id').put(updatePackage).delete(deletePackage);

export default router;
