import { getPlatformSettings, IPlatformSettings } from '../models/PlatformSettings';
import { WhatsAppService, SupportLeadWhatsAppPayload, BookingWhatsAppPayload, ProcessingWhatsAppPayload, ShippingWhatsAppPayload, DeliveryWhatsAppPayload, AbandonedCartWhatsAppPayload } from './whatsapp.service';
import {
  sendBookingConfirmedEmail,
  sendSampleReceivedEmail,
  sendTestReportReadyEmail,
  sendPaymentPendingEmail,
  sendSampleCollectedEmail,
  CustomerEmailData,
} from '../utils/mailer';
import logger from '../utils/logger';

export class NotificationService {
  /**
   * Dispatches Support Request Alert to Admin via WhatsApp and/or Email.
   * Requirement #14: Instant Admin Notification on Support submission.
   */
  public static async notifySupportRequest(payload: SupportLeadWhatsAppPayload): Promise<void> {
    try {
      const settings = await getPlatformSettings();
      const workflow = settings.notificationWorkflows?.supportRequestAdminAlert || { email: true, whatsapp: true };
      const adminPhone = settings.adminWhatsAppNumber || process.env.ADMIN_WHATSAPP_NUMBER || '+919876543210';

      // 1. WhatsApp Channel
      if (workflow.whatsapp && adminPhone) {
        await WhatsAppService.sendAdminSupportNotification(adminPhone, payload);
      }

      logger.info(`[Notification] Processed Support Request alert for ${payload.name}`);
    } catch (err: any) {
      logger.error(`[Notification] Error sending support request notification: ${err.message}`, err);
    }
  }

  /**
   * Dispatches Order Confirmation notification (Email & WhatsApp).
   * Requirement #4: Order confirmation workflow.
   */
  public static async notifyOrderConfirmation(params: {
    customerEmail?: string;
    customerPhone?: string;
    customerName: string;
    bookingId: string;
    productName?: string;
    testNames?: string;
    sampleQty?: string;
    amount?: number | string;
    bookingDate?: string;
  }): Promise<void> {
    try {
      const settings = await getPlatformSettings();
      const workflow = settings.notificationWorkflows?.orderConfirmation || { email: true, whatsapp: true };

      // 1. Email Channel
      if (workflow.email && params.customerEmail) {
        await sendBookingConfirmedEmail(params.customerEmail, {
          customerName: params.customerName,
          bookingId: params.bookingId,
          productName: params.productName || 'Diagnostic Sample',
          testList: params.testNames || 'Food Quality & Safety Suite',
          sampleQty: params.sampleQty || '1',
          bookingDate: params.bookingDate || new Date().toLocaleDateString('en-IN'),
        });
      }

      // 2. WhatsApp Channel
      if (workflow.whatsapp && params.customerPhone) {
        await WhatsAppService.sendOrderConfirmation(params.customerPhone, {
          customerName: params.customerName,
          bookingId: params.bookingId,
          testNames: params.testNames,
          amount: params.amount,
          bookingDate: params.bookingDate,
        });
      }
    } catch (err: any) {
      logger.error(`[Notification] Error in notifyOrderConfirmation: ${err.message}`, err);
    }
  }

  /**
   * Fetches a paid/approved booking by ID, populates details, checks for duplicate sends,
   * and dispatches the booking confirmation email & WhatsApp.
   */
  public static async notifyConfirmedBookingById(bookingId: string): Promise<void> {
    try {
      const Booking = (await import('../models/Booking')).default;
      const booking = await Booking.findById(bookingId)
        .populate('userId', 'firstName lastName email phone')
        .populate('items.testId', 'testName')
        .populate('items.packageId', 'name');

      if (!booking || !booking.userId) return;

      if (!booking.metadata) booking.metadata = {};
      if (booking.metadata.confirmationEmailSent) {
        return; // Already sent, avoid duplicate emails
      }

      const user = booking.userId as any;
      const customerName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Valued Customer';

      const testNames = booking.items.map((item: any) => {
        if (item.testId) return item.testId.testName;
        if (item.packageId) return item.packageId.name;
        return 'Diagnostic Test';
      }).filter(Boolean).join(', ');

      const productNames = booking.items.map((item: any) => {
        return item.samples?.map((s: any) => s.productName).filter(Boolean).join(', ');
      }).filter(Boolean).join(', ');

      const totalSamples = booking.items.reduce((total: number, item: any) => {
        return total + (item.samples?.reduce((sum: number, s: any) => sum + (Number(s.quantity) || 1), 0) || 0);
      }, 0);

      booking.metadata.confirmationEmailSent = true;
      booking.metadata.confirmationEmailSentAt = new Date();
      booking.markModified('metadata');
      await booking.save();

      await this.notifyOrderConfirmation({
        customerEmail: user.email,
        customerPhone: user.phone,
        customerName,
        bookingId: booking._id.toString(),
        productName: productNames || 'Diagnostic Sample',
        testNames: testNames || 'Food Quality & Safety Diagnostics',
        sampleQty: totalSamples.toString(),
        amount: booking.totalAmount,
        bookingDate: new Date(booking.bookingDate || Date.now()).toLocaleDateString('en-IN'),
      });
    } catch (err: any) {
      logger.error(`[Notification] Error in notifyConfirmedBookingById for ${bookingId}: ${err.message}`, err);
    }
  }

  /**
   * Dispatches Order Processing / Sample In Lab notification.
   * Requirement #4: Order processing workflow.
   */
  public static async notifyOrderProcessing(params: {
    customerEmail?: string;
    customerPhone?: string;
    customerName: string;
    bookingId: string;
    labName?: string;
    statusText?: string;
    receivedDate?: string;
  }): Promise<void> {
    try {
      const settings = await getPlatformSettings();
      const workflow = settings.notificationWorkflows?.orderProcessing || { email: true, whatsapp: true };

      // 1. Email Channel
      if (workflow.email && params.customerEmail) {
        await sendSampleReceivedEmail(params.customerEmail, {
          customerName: params.customerName,
          bookingId: params.bookingId,
          receivedDate: params.receivedDate || new Date().toLocaleDateString('en-IN'),
        });
      }

      // 2. WhatsApp Channel
      if (workflow.whatsapp && params.customerPhone) {
        await WhatsAppService.sendOrderProcessing(params.customerPhone, {
          customerName: params.customerName,
          bookingId: params.bookingId,
          labName: params.labName,
          statusText: params.statusText || 'Sample Under Testing in Laboratory',
        });
      }
    } catch (err: any) {
      logger.error(`[Notification] Error in notifyOrderProcessing: ${err.message}`, err);
    }
  }

  /**
   * Dispatches Shipping & Logistics update notification.
   * Requirement #4: Shipping updates workflow.
   */
  public static async notifyShippingUpdate(params: {
    customerEmail?: string;
    customerPhone?: string;
    customerName: string;
    bookingId: string;
    collectionMethod?: string;
    courierName?: string;
    trackingId?: string;
    collectorName?: string;
    collectorPhone?: string;
  }): Promise<void> {
    try {
      const settings = await getPlatformSettings();
      const workflow = settings.notificationWorkflows?.shippingUpdates || { email: true, whatsapp: true };

      // 1. Email Channel
      if (workflow.email && params.customerEmail) {
        await sendSampleCollectedEmail(params.customerEmail, {
          customerName: params.customerName,
          bookingId: params.bookingId,
        });
      }

      // 2. WhatsApp Channel
      if (workflow.whatsapp && params.customerPhone) {
        await WhatsAppService.sendShippingUpdate(params.customerPhone, {
          customerName: params.customerName,
          bookingId: params.bookingId,
          collectionMethod: params.collectionMethod,
          courierName: params.courierName,
          trackingId: params.trackingId,
          collectorName: params.collectorName,
          collectorPhone: params.collectorPhone,
        });
      }
    } catch (err: any) {
      logger.error(`[Notification] Error in notifyShippingUpdate: ${err.message}`, err);
    }
  }

  /**
   * Dispatches Delivery / Test Report Ready notification.
   * Requirement #4: Delivery updates workflow.
   */
  public static async notifyDeliveryUpdate(params: {
    customerEmail?: string;
    customerPhone?: string;
    customerName: string;
    bookingId: string;
    portalUrl?: string;
  }): Promise<void> {
    try {
      const settings = await getPlatformSettings();
      const workflow = settings.notificationWorkflows?.deliveryUpdates || { email: true, whatsapp: true };

      // 1. Email Channel
      if (workflow.email && params.customerEmail) {
        await sendTestReportReadyEmail(params.customerEmail, {
          customerName: params.customerName,
          bookingId: params.bookingId,
        });
      }

      // 2. WhatsApp Channel
      if (workflow.whatsapp && params.customerPhone) {
        await WhatsAppService.sendDeliveryUpdate(params.customerPhone, {
          customerName: params.customerName,
          bookingId: params.bookingId,
          portalUrl: params.portalUrl,
        });
      }
    } catch (err: any) {
      logger.error(`[Notification] Error in notifyDeliveryUpdate: ${err.message}`, err);
    }
  }

  /**
   * Dispatches Abandoned Cart reminder notification.
   * Requirement #4: Abandoned cart reminders workflow.
   */
  public static async notifyAbandonedCart(params: {
    customerEmail?: string;
    customerPhone?: string;
    customerName: string;
    itemCount: number;
    testNames?: string;
    totalAmount?: number | string;
    checkoutUrl?: string;
  }): Promise<void> {
    try {
      const settings = await getPlatformSettings();
      const workflow = settings.notificationWorkflows?.abandonedCart || { email: true, whatsapp: true };

      // 1. Email Channel
      if (workflow.email && params.customerEmail) {
        await sendPaymentPendingEmail(params.customerEmail, {
          customerName: params.customerName,
          testList: params.testNames || `${params.itemCount} diagnostic items`,
          amount: String(params.totalAmount || '0'),
        });
      }

      // 2. WhatsApp Channel
      if (workflow.whatsapp && params.customerPhone) {
        await WhatsAppService.sendAbandonedCartReminder(params.customerPhone, {
          customerName: params.customerName,
          itemCount: params.itemCount,
          totalAmount: params.totalAmount,
          checkoutUrl: params.checkoutUrl,
        });
      }
    } catch (err: any) {
      logger.error(`[Notification] Error in notifyAbandonedCart: ${err.message}`, err);
    }
  }
}
export default NotificationService;
