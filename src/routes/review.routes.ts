import { Router } from 'express';
import {
  createReview,
  getReviews,
  getPublicReviews,
  getReviewById,
  updateReview,
  deleteReview,
} from '../controllers/review.controller';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';
import { UserRole } from '../types';

const router = Router();

/**
 * @swagger
 * /api/v1/reviews/public:
 *   get:
 *     summary: Get all visible reviews
 *     tags: [Review]
 *     responses:
 *       200:
 *         description: List of visible reviews
 */
router.get('/public', getPublicReviews);

// All following routes require ADMIN role
router.use(authMiddleware, roleMiddleware([UserRole.ADMIN]));

/**
 * @swagger
 * /api/v1/reviews:
 *   get:
 *     summary: Get all reviews (Admin only)
 *     tags: [Review]
 *     security:
 *       - bearerAuth: []
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
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of reviews
 */
router.get('/', getReviews);

/**
 * @swagger
 * /api/v1/reviews:
 *   post:
 *     summary: Create a review (Admin only)
 *     tags: [Review]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - city
 *               - rating
 *               - text
 *             properties:
 *               name:
 *                 type: string
 *               city:
 *                 type: string
 *               rating:
 *                 type: number
 *               text:
 *                 type: string
 *               dateText:
 *                 type: string
 *               isVisible:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Review created
 */
router.post('/', createReview);

/**
 * @swagger
 * /api/v1/reviews/{id}:
 *   get:
 *     summary: Get review by ID (Admin only)
 *     tags: [Review]
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
 *         description: Review details
 */
router.get('/:id', getReviewById);

/**
 * @swagger
 * /api/v1/reviews/{id}:
 *   patch:
 *     summary: Update review (Admin only)
 *     tags: [Review]
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
 *         description: Review updated
 */
router.patch('/:id', updateReview);

/**
 * @swagger
 * /api/v1/reviews/{id}:
 *   delete:
 *     summary: Delete review (Admin only)
 *     tags: [Review]
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
 *         description: Review deleted
 */
router.delete('/:id', deleteReview);

export default router;
