import { Router } from 'express';
import { SearchController } from '../controllers/search.controller';

const router = Router();

router.get('/suggestions', SearchController.getSuggestions);

export default router;
