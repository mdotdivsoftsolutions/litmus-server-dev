import { Router } from 'express';
import { getPublicSettings } from '../controllers/platformSettings.controller';

const router = Router();

router.get('/public', getPublicSettings);

export default router;
