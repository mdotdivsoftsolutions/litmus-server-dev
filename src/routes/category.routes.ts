import { Router } from 'express';
import { createCategory, getCategories, getCategory, updateCategory, deleteCategory } from '../controllers/category.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Public route
router.get('/', getCategories);
router.get('/:id', getCategory);

// Protected routes (Admin only)
router.use(authMiddleware, adminMiddleware);
router.post('/', createCategory);
router.patch('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;
