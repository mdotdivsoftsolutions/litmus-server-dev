import cron from 'node-cron';
import Cart from '../models/Cart';
import User from '../models/User';
import Booking from '../models/Booking';
import { getPlatformSettings } from '../models/PlatformSettings';
import NotificationService from '../services/notification.service';
import logger from '../utils/logger';

/**
 * Scans active carts with items that have not been converted to a booking
 * within the configured delayHours window.
 */
export const runAbandonedCartScan = async (): Promise<{ scanned: number; notified: number }> => {
  try {
    const settings = await getPlatformSettings();
    const workflow = settings.notificationWorkflows?.abandonedCart;

    if (!workflow || (!workflow.email && !workflow.whatsapp)) {
      logger.info('[Abandoned Cart] Reminders are currently disabled in Notification Settings.');
      return { scanned: 0, notified: 0 };
    }

    const delayHours = workflow.delayHours || 2;
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - delayHours);

    // Find carts with items updated before the cutoff time
    const carts = await Cart.find({
      userId: { $exists: true, $ne: null },
      'items.0': { $exists: true },
      updatedAt: { $lt: cutoffTime },
    }).populate('userId', 'firstName lastName email phone isActive');

    let notifiedCount = 0;

    for (const cart of carts) {
      const user = cart.userId as any;
      if (!user || !user.isActive) continue;

      // Check if the user already completed a booking since the cart was last updated
      const recentBooking = await Booking.findOne({
        userId: user._id,
        createdAt: { $gte: cart.updatedAt },
      });

      if (recentBooking) {
        continue; // User booked after updating cart
      }

      const customerName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Valued Customer';
      const itemCount = cart.items?.length || 0;
      const totalAmount = cart.items?.reduce((sum: number, item: any) => sum + (Number(item.price) || 0), 0) || 0;

      await NotificationService.notifyAbandonedCart({
        customerEmail: user.email,
        customerPhone: user.phone,
        customerName,
        itemCount,
        totalAmount,
      });

      notifiedCount++;
    }

    logger.info(`[Abandoned Cart Job] Scanned ${carts.length} carts. Sent ${notifiedCount} reminders.`);
    return { scanned: carts.length, notified: notifiedCount };
  } catch (error: any) {
    logger.error(`[Abandoned Cart Job] Error executing scan: ${error.message}`, error);
    return { scanned: 0, notified: 0 };
  }
};

/**
 * Runs periodically (every 2 hours)
 */
export const startAbandonedCartJob = () => {
  cron.schedule('0 */2 * * *', async () => {
    logger.info('[Cron] Triggering scheduled abandoned cart scan...');
    await runAbandonedCartScan();
  });
};
