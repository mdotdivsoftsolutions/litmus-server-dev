import axios from 'axios';
import logger from '../utils/logger';

export interface SupportLeadWhatsAppPayload {
  name: string;
  phone: string;
  email?: string;
  business?: string;
  serviceName?: string;
  message?: string;
  source?: string;
  date?: string;
}

export interface BookingWhatsAppPayload {
  customerName: string;
  bookingId: string;
  testNames?: string;
  amount?: number | string;
  bookingDate?: string;
}

export interface ProcessingWhatsAppPayload {
  customerName: string;
  bookingId: string;
  statusText?: string;
  labName?: string;
}

export interface ShippingWhatsAppPayload {
  customerName: string;
  bookingId: string;
  collectionMethod?: string;
  courierName?: string;
  trackingId?: string;
  collectorName?: string;
  collectorPhone?: string;
}

export interface DeliveryWhatsAppPayload {
  customerName: string;
  bookingId: string;
  portalUrl?: string;
}

export interface AbandonedCartWhatsAppPayload {
  customerName: string;
  itemCount: number;
  totalAmount?: number | string;
  checkoutUrl?: string;
}

export class WhatsAppService {
  /**
   * Normalizes standard international phone numbers for WhatsApp Cloud API.
   * Strips spaces, hyphens, and '+'.
   * If 10 digits are provided (common in India), automatically prepends '91'.
   */
  public static normalizePhone(phone: string): string {
    if (!phone) return '';
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.length === 10) {
      cleaned = `91${cleaned}`;
    }
    return cleaned;
  }

  /**
   * Checks whether Meta WhatsApp Cloud API credentials are configured in .env
   */
  public static isConfigured(): boolean {
    const token = process.env.WHATSAPP_API_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    return Boolean(token && phoneId && token !== 'your_meta_whatsapp_cloud_api_token_here');
  }

  /**
   * Dispatches Meta Approved Template Message (works even outside 24h window).
   */
  public static async sendTemplateMessage(
    to: string,
    templateName: string = 'hello_world',
    languageCode: string = 'en_US'
  ): Promise<{ success: boolean; messageId?: string; mocked?: boolean; error?: string }> {
    const normalizedTo = this.normalizePhone(to);
    if (!normalizedTo) {
      return { success: false, error: 'Invalid phone number' };
    }

    const token = process.env.WHATSAPP_API_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v20.0';

    if (!this.isConfigured()) {
      logger.info(`[WhatsApp MOCK / DEV] Template: ${templateName} -> To: +${normalizedTo}`);
      return { success: true, mocked: true };
    }

    try {
      const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
      const response = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedTo,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: languageCode,
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const messageId = response.data?.messages?.[0]?.id;
      logger.info(`[WhatsApp Template] Sent template ${templateName} to +${normalizedTo}. Message ID: ${messageId}`);
      return { success: true, messageId };
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message || 'Unknown WhatsApp API error';
      logger.error(`[WhatsApp API Error] Failed template message to +${normalizedTo}: ${errorMsg}`, error.response?.data || error);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Low-level WhatsApp text message dispatcher.
   */
  public static async sendTextMessage(to: string, messageBody: string): Promise<{ success: boolean; messageId?: string; mocked?: boolean; error?: string }> {
    const normalizedTo = this.normalizePhone(to);
    if (!normalizedTo) {
      logger.warn('[WhatsApp] Invalid recipient phone number provided');
      return { success: false, error: 'Invalid phone number' };
    }

    const token = process.env.WHATSAPP_API_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v20.0';

    if (!this.isConfigured()) {
      logger.info(`[WhatsApp MOCK / DEV] Recipient: +${normalizedTo}\n--- MESSAGE BODY ---\n${messageBody}\n--------------------`);
      return { success: true, mocked: true };
    }

    try {
      const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
      const response = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedTo,
          type: 'text',
          text: {
            preview_url: false,
            body: messageBody,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const messageId = response.data?.messages?.[0]?.id;
      logger.info(`[WhatsApp] Sent successfully to +${normalizedTo}. Message ID: ${messageId}`);
      return { success: true, messageId };
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message || 'Unknown WhatsApp API error';
      logger.error(`[WhatsApp API Error] Failed to send message to +${normalizedTo}: ${errorMsg}`, error.response?.data || error);
      
      // If dev mode, don't break execution
      if (process.env.NODE_ENV === 'development') {
        logger.info(`[WhatsApp DEV Fallback] Logged payload for +${normalizedTo}`);
        return { success: true, mocked: true };
      }
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Requirement #14: Instant Admin WhatsApp Notification on Support / Consultation Request
   */
  public static async sendAdminSupportNotification(adminPhone: string, data: SupportLeadWhatsAppPayload): Promise<boolean> {
    const formattedDate = data.date || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const text = [
      `🚨 *LITMUS - NEW SUPPORT LEAD / CALLBACK*`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `👤 *Name:* ${data.name}`,
      `📞 *Phone:* ${data.phone}`,
      `✉️ *Email:* ${data.email || 'Not provided'}`,
      `🏢 *Company:* ${data.business || 'Individual / Retail'}`,
      `🔬 *Service:* ${data.serviceName || 'General Enquiry'}`,
      `📝 *Message:* ${data.message || 'Requested callback via online portal'}`,
      `🌐 *Source:* ${data.source || 'Website Contact Form'}`,
      `⏰ *Time:* ${formattedDate}`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `👉 _Please follow up with the client within SLA guidelines._`,
    ].join('\n');

    const result = await this.sendTextMessage(adminPhone, text);
    return result.success;
  }

  /**
   * Requirement #4: Order Confirmation WhatsApp
   */
  public static async sendOrderConfirmation(customerPhone: string, data: BookingWhatsAppPayload): Promise<boolean> {
    const text = [
      `🧪 *LITMUS FOOD ANALYTICS - BOOKING CONFIRMED*`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `Dear *${data.customerName}*,`,
      `Thank you for choosing Litmus. Your diagnostic test booking has been confirmed.`,
      ``,
      `🔖 *Booking ID:* ${data.bookingId}`,
      `📋 *Tests Selected:* ${data.testNames || 'Diagnostics Testing'}`,
      `💰 *Total Amount:* ₹${data.amount || '0'}`,
      `📅 *Date:* ${data.bookingDate || new Date().toLocaleDateString('en-IN')}`,
      ``,
      `Our logistics team is coordinating your sample collection. Track your progress directly from your Litmus customer dashboard.`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `_Litmus Quality Assurance Team_`,
    ].join('\n');

    const result = await this.sendTextMessage(customerPhone, text);
    return result.success;
  }

  /**
   * Requirement #4: Order Processing / Sample In Lab WhatsApp
   */
  public static async sendOrderProcessing(customerPhone: string, data: ProcessingWhatsAppPayload): Promise<boolean> {
    const text = [
      `🔬 *LITMUS - SAMPLE UNDER TESTING*`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `Hello *${data.customerName}*,`,
      `Your sample for Booking *#${data.bookingId}* has been received at our accredited laboratory and registered in the Laboratory Information Management System (LIMS).`,
      ``,
      `📊 *Status:* ${data.statusText || 'Analysis In Progress'}`,
      data.labName ? `🏢 *Lab Facility:* ${data.labName}` : '',
      ``,
      `Our certified analysts are conducting the diagnostic procedures. You will be notified the moment your report is ready.`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `_Litmus Laboratory Operations_`,
    ].filter(Boolean).join('\n');

    const result = await this.sendTextMessage(customerPhone, text);
    return result.success;
  }

  /**
   * Requirement #4: Shipping / Logistics Updates WhatsApp
   */
  public static async sendShippingUpdate(customerPhone: string, data: ShippingWhatsAppPayload): Promise<boolean> {
    const isCourier = data.collectionMethod === 'COURIER' || Boolean(data.trackingId);
    const text = isCourier
      ? [
          `🚚 *LITMUS - SAMPLE DISPATCH UPDATE*`,
          `━━━━━━━━━━━━━━━━━━━━━`,
          `Hello *${data.customerName}*,`,
          `Your sample parcel for Booking *#${data.bookingId}* is currently in transit to our testing center.`,
          ``,
          data.courierName ? `📦 *Courier Partner:* ${data.courierName}` : '',
          data.trackingId ? `🔖 *Tracking AWB:* ${data.trackingId}` : '',
          ``,
          `We will notify you immediately once the laboratory confirms physical receipt and integrity verification.`,
          `━━━━━━━━━━━━━━━━━━━━━`,
        ].filter(Boolean).join('\n')
      : [
          `🛵 *LITMUS - PICKUP AGENT ASSIGNED*`,
          `━━━━━━━━━━━━━━━━━━━━━`,
          `Hello *${data.customerName}*,`,
          `A certified sample collection officer has been assigned for your Booking *#${data.bookingId}*.`,
          ``,
          data.collectorName ? `👤 *Agent Name:* ${data.collectorName}` : '',
          data.collectorPhone ? `📞 *Agent Contact:* ${data.collectorPhone}` : '',
          ``,
          `Please have your sealed sample containers ready as per the guidelines.`,
          `━━━━━━━━━━━━━━━━━━━━━`,
        ].filter(Boolean).join('\n');

    const result = await this.sendTextMessage(customerPhone, text);
    return result.success;
  }

  /**
   * Requirement #4: Delivery / Report Ready WhatsApp
   */
  public static async sendDeliveryUpdate(customerPhone: string, data: DeliveryWhatsAppPayload): Promise<boolean> {
    const text = [
      `📑 *LITMUS - OFFICIAL TEST REPORT PUBLISHED*`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `Great news *${data.customerName}*!`,
      `The clinical testing and quality certification for Booking *#${data.bookingId}* has been completed.`,
      ``,
      `Your verified laboratory report is now available for viewing and digital download.`,
      data.portalUrl ? `🔗 *View Report:* ${data.portalUrl}` : `🔗 *Customer Portal:* Log in to your Litmus dashboard`,
      ``,
      `Thank you for trusting Litmus Food Analytics for your testing requirements.`,
      `━━━━━━━━━━━━━━━━━━━━━`,
    ].join('\n');

    const result = await this.sendTextMessage(customerPhone, text);
    return result.success;
  }

  /**
   * Requirement #4: Abandoned Cart Reminder WhatsApp
   */
  public static async sendAbandonedCartReminder(customerPhone: string, data: AbandonedCartWhatsAppPayload): Promise<boolean> {
    const text = [
      `🛒 *LITMUS - COMPLETE YOUR TEST BOOKING*`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `Hello *${data.customerName}*,`,
      `We noticed you have *${data.itemCount} diagnostic test(s)* waiting in your cart.`,
      ``,
      data.totalAmount ? `💰 *Cart Total:* ₹${data.totalAmount}` : '',
      ``,
      `Complete your order today to secure your testing slot and priority sample processing.`,
      data.checkoutUrl ? `👉 *Proceed to Checkout:* ${data.checkoutUrl}` : `👉 *Visit Litmus:* Log in to complete your booking`,
      `━━━━━━━━━━━━━━━━━━━━━`,
    ].filter(Boolean).join('\n');

    const result = await this.sendTextMessage(customerPhone, text);
    return result.success;
  }
}
export default WhatsAppService;
