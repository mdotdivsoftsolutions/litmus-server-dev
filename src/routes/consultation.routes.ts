import express from 'express';
import { createConsultation, getConsultations, updateConsultationStatus } from '../controllers/consultation.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

router.post('/', createConsultation);
router.get('/', authMiddleware, adminMiddleware, getConsultations);
router.patch('/:id/status', authMiddleware, adminMiddleware, updateConsultationStatus);

export default router;
