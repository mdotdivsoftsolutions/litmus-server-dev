import { Router } from 'express';
import { getTags, createTag, deleteTag } from '../controllers/tag.controller';

const router = Router();

router.route('/')
  .get(getTags)
  .post(createTag);

router.route('/:id')
  .delete(deleteTag);

export default router;
