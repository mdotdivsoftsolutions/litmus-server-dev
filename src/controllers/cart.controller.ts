import { Request, Response } from 'express';
import Cart from '../models/Cart';
import Test from '../models/Test';
import Package from '../models/Package';
import logger from '../utils/logger';

// Helper to find or create cart
const findOrCreateCart = async (userId: string | null, sessionId: string) => {
  let cart;
  if (userId) {
    cart = await Cart.findOne({ userId });
  }
  if (!cart && sessionId) {
    cart = await Cart.findOne({ sessionId });
  }
  if (!cart) {
    cart = new Cart({ userId, sessionId, items: [] });
  } else if (userId && !cart.userId) {
    // If a user logs in, merge their session cart
    cart.userId = userId as any;
  }
  return cart;
};

// @desc    Get current user or session cart
// @route   GET /api/v1/cart
// @access  Public
export const getCart = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || null;
    const sessionId = req.headers['x-session-id'] as string || '';

    const cart = await Cart.findOne(userId ? { userId } : { sessionId })
      .populate('items.testId', 'testName metadata discountType discountValue price turnAroundTime')
      .populate({
        path: 'items.packageId',
        select: 'name features tests',
        populate: { path: 'tests', select: 'testName' }
      });

    res.status(200).json({
      success: true,
      data: cart || { items: [] },
    });
  } catch (error: any) {
    logger.error(`Error in getCart: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error: Could not fetch cart',
    });
  }
};

// @desc    Add item to cart
// @route   POST /api/v1/cart/add
// @access  Public
export const addToCart = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || null;
    const sessionId = req.headers['x-session-id'] as string || '';
    
    if (!userId && !sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required for guest users.' });
    }

    const { itemType, testId, packageId, parameters } = req.body;

    if (!itemType || (itemType === 'TEST' && !testId) || (itemType === 'PACKAGE' && !packageId)) {
      return res.status(400).json({ success: false, message: 'Invalid item data provided.' });
    }

    let price = 0;
    let mrp = 0;

    if (itemType === 'TEST') {
      const test = await Test.findById(testId);
      if (!test) return res.status(404).json({ success: false, message: 'Test not found.' });
      const testParams = test.metadata?.parameters || [];
      const selectedParamsArr = Array.isArray(parameters) ? parameters : [];
      const calculatedPrice = testParams.reduce((sum: number, p: any) => selectedParamsArr.includes(p.name) ? sum + (Number(p.price) || 0) : sum, 0);
      
      const baseTotal = calculatedPrice > 0 ? calculatedPrice : (test.price || 0);
      
      let discount = 0;
      if ((test as any).discountType === 'PERCENTAGE') {
        discount = baseTotal * (((test as any).discountValue || 0) / 100);
      } else if ((test as any).discountType === 'FLAT') {
        discount = (test as any).discountValue || 0;
      }
      
      price = Math.max(0, baseTotal - discount);
      mrp = baseTotal;
    } else if (itemType === 'PACKAGE') {
      const pkg = await Package.findById(packageId);
      if (!pkg) return res.status(404).json({ success: false, message: 'Package not found.' });
      price = pkg.price || 0;
      mrp = pkg.mrp || 0;
    }

    const cart = await findOrCreateCart(userId, sessionId);

    // Check for duplicates
    let existingItem;
    if (itemType === 'TEST') {
      existingItem = cart.items.find((i: any) => i.itemType === 'TEST' && i.testId?.toString() === testId);
    } else if (itemType === 'PACKAGE') {
      existingItem = cart.items.find((i: any) => i.itemType === 'PACKAGE' && i.packageId?.toString() === packageId);
    }

    if (existingItem) {
      if (itemType === 'TEST' && parameters) {
        // Update parameters if it's a test
        existingItem.parameters = parameters;
      }
    } else {
      // Add item
      cart.items.push({
        itemType,
        testId: itemType === 'TEST' ? testId : undefined,
        packageId: itemType === 'PACKAGE' ? packageId : undefined,
        parameters: itemType === 'TEST' ? parameters : undefined,
        price,
        mrp,
      });
    }

    await cart.save();

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error: any) {
    logger.error(`Error in addToCart: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error: Could not add item to cart',
    });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/v1/cart/remove/:itemId
// @access  Public
export const removeFromCart = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || null;
    const sessionId = req.headers['x-session-id'] as string || '';

    const cart = await Cart.findOne(userId ? { userId } : { sessionId });

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    cart.items = cart.items.filter((item: any) => item._id.toString() !== req.params.itemId);
    await cart.save();

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error: any) {
    logger.error(`Error in removeFromCart: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error: Could not remove item',
    });
  }
};

// @desc    Clear entire cart
// @route   DELETE /api/v1/cart/clear
// @access  Public
export const clearCart = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || null;
    const sessionId = req.headers['x-session-id'] as string || '';

    const cart = await Cart.findOne(userId ? { userId } : { sessionId });

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    cart.items = [];
    await cart.save();

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error: any) {
    logger.error(`Error in clearCart: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server Error: Could not clear cart',
    });
  }
};
