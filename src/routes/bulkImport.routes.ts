import { Router } from 'express';
import multer from 'multer';
import {
  importCategories,
  importTests,
  importPackages,
  importLaboratories,
  importMaster,
} from '../controllers/bulkImport.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Configure multer memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max file size
  },
});

// Protect all bulk import routes with admin auth
router.use(authMiddleware, adminMiddleware);

// Endpoints
router.post('/categories', upload.single('file'), importCategories);
router.post('/tests', upload.single('file'), importTests);
router.post('/packages', upload.single('file'), importPackages);
router.post('/laboratories', upload.single('file'), importLaboratories);
router.post('/master', upload.single('file'), importMaster);

export default router;
