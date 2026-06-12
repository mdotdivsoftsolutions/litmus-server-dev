import { Router } from 'express';
import { getInfrastructureOptions, createInfrastructureOption, deleteInfrastructureOption } from '../controllers/infrastructure.controller';

const router = Router();

router.get('/', getInfrastructureOptions);
router.post('/', createInfrastructureOption);
router.delete('/:id', deleteInfrastructureOption);

export default router;
