import express from 'express';
import {
  getCart,
  addToCart,
  removeFromCart,
  clearCart
} from '../controllers/cart.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

// Note: Using a middleware-like wrapper for protect if we want optional auth, 
// or we can just leave it public and read req.user if the auth middleware supports it.
// The easiest way is to let the controller handle both authenticated and guest sessions.
// We'll apply optional auth middleware or just rely on headers inside the controller.
// Since protect enforces a token, we might not want it for guests. Let's just make the routes public and the controller checks headers.
// Wait, to populate `req.user` without throwing error for missing token, we can use an optionalAuth middleware.
// But for simplicity, we'll just parse the auth header manually or rely on `req.user` if `protect` allows fall-through.
// Actually, let's just make the routes public and we'll check the session ID.

router.route('/')
  .get(getCart);

router.route('/add')
  .post(addToCart);

router.route('/remove/:itemId')
  .delete(removeFromCart);

router.route('/clear')
  .delete(clearCart);

export default router;
