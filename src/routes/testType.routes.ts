import { Router } from 'express';
import { getTestTypes, createTestType, deleteTestType } from '../controllers/testType.controller';

const router = Router();

router.route('/')
  .get(getTestTypes)
  .post(createTestType);

router.route('/:id')
  .delete(deleteTestType);

export default router;
