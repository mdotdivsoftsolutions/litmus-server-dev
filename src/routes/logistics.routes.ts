import { Router } from 'express';
import { getLogisticsOptions, createLogisticsOption, deleteLogisticsOption } from '../controllers/logistics.controller';

const router = Router();

router.get('/', getLogisticsOptions);
router.post('/', createLogisticsOption);
router.delete('/:id', deleteLogisticsOption);

export default router;
