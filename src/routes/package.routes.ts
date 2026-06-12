import { Router } from 'express';
import {
  createPackage,
  getPackages,
  getPackageById,
  updatePackage,
  deletePackage,
} from '../controllers/package.controller';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';
import { UserRole } from '../types';

const router = Router();

// Public routes
router.route('/').get(getPackages);
router.route('/:id').get(getPackageById);

// Protected routes (Admin and Lab only)
router.use(authMiddleware);
router.use(roleMiddleware([UserRole.ADMIN, UserRole.LAB]));

router.route('/').post(createPackage);
router.route('/:id').put(updatePackage).delete(deletePackage);

export default router;
