import { Router } from 'express';
import { createTest, getTests, getTestById, updateTest, deleteTest } from '../controllers/test.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Public route
router.get('/', getTests);
router.get('/:id', getTestById);

// Protected routes (Admin only)
router.use(authMiddleware, adminMiddleware);
router.post('/', createTest);
router.patch('/:id', updateTest);
router.delete('/:id', deleteTest);

export default router;
