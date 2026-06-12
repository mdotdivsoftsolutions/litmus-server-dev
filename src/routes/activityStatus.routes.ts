import { Router } from 'express';
import { getActivityStatuses, createActivityStatus, deleteActivityStatus } from '../controllers/activityStatus.controller';

const router = Router();

router.get('/', getActivityStatuses);
router.post('/', createActivityStatus);
router.delete('/:id', deleteActivityStatus);

export default router;
