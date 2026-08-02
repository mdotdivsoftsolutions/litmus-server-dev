import express from 'express';
import {
  getCart,
  addToCart,
  removeFromCart,
  clearCart
} from '../controllers/cart.controller';
import { optionalAuthMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

router.use(optionalAuthMiddleware);

router.route('/')
  .get(getCart);

router.route('/add')
  .post(addToCart);

router.route('/remove/:itemId')
  .delete(removeFromCart);

router.route('/clear')
  .delete(clearCart);

export default router;
