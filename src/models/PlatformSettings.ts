import mongoose, { Document, Schema } from 'mongoose';

export interface INotificationWorkflowChannel {
  email: boolean;
  whatsapp: boolean;
  template?: string;
  delayHours?: number;
}

export interface INotificationWorkflows {
  orderConfirmation: INotificationWorkflowChannel;
  orderProcessing: INotificationWorkflowChannel;
  shippingUpdates: INotificationWorkflowChannel;
  deliveryUpdates: INotificationWorkflowChannel;
  abandonedCart: INotificationWorkflowChannel;
  supportRequestAdminAlert: INotificationWorkflowChannel;
  customerNotifications: INotificationWorkflowChannel;
}

export interface IPlatformSettings extends Document {
  pickupCities: string[];
  enablePickupSlotSelection: boolean;
  adminWhatsAppNumber?: string;
  adminEmailRecipient?: string;
  notificationWorkflows: INotificationWorkflows;
}

const defaultWorkflowChannel = (email = true, whatsapp = true, extra = {}) => ({
  email,
  whatsapp,
  ...extra,
});

const platformSettingsSchema = new Schema(
  {
    pickupCities: {
      type: [String],
      default: ['Chennai'],
    },
    enablePickupSlotSelection: {
      type: Boolean,
      default: false,
    },
    adminWhatsAppNumber: {
      type: String,
      default: process.env.ADMIN_WHATSAPP_NUMBER || '+919876543210',
      trim: true,
    },
    adminEmailRecipient: {
      type: String,
      default: process.env.SMTP_FROM || 'admin@litmus.ai',
      trim: true,
    },
    notificationWorkflows: {
      orderConfirmation: {
        email: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: true },
        template: { type: String, default: 'Standard Order Confirmation' },
      },
      orderProcessing: {
        email: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: true },
        template: { type: String, default: 'Order Processing & Sample In Lab' },
      },
      shippingUpdates: {
        email: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: true },
        template: { type: String, default: 'Sample In Transit / Logistics Dispatched' },
      },
      deliveryUpdates: {
        email: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: true },
        template: { type: String, default: 'Test Report Published & Ready' },
      },
      abandonedCart: {
        email: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: true },
        delayHours: { type: Number, default: 2 },
        template: { type: String, default: 'Complete Your Lab Test Booking' },
      },
      supportRequestAdminAlert: {
        email: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: true },
        template: { type: String, default: 'Instant Admin Support Lead Alert' },
      },
      customerNotifications: {
        email: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: true },
        template: { type: String, default: 'General Updates & Announcements' },
      },
    },
  },
  { timestamps: true }
);

export const PlatformSettings = mongoose.model<IPlatformSettings>('PlatformSettings', platformSettingsSchema);

export async function getPlatformSettings() {
  let settings = await PlatformSettings.findOne();
  if (!settings) {
    settings = await PlatformSettings.create({
      pickupCities: ['Chennai'],
      adminWhatsAppNumber: process.env.ADMIN_WHATSAPP_NUMBER || '+919876543210',
    });
  }
  if (!settings.pickupCities || settings.pickupCities.length === 0) {
    settings.pickupCities = ['Chennai'];
  }
  if (!settings.adminWhatsAppNumber) {
    settings.adminWhatsAppNumber = process.env.ADMIN_WHATSAPP_NUMBER || '+919876543210';
  }
  if (!settings.notificationWorkflows) {
    settings.notificationWorkflows = {
      orderConfirmation: defaultWorkflowChannel(true, true),
      orderProcessing: defaultWorkflowChannel(true, true),
      shippingUpdates: defaultWorkflowChannel(true, true),
      deliveryUpdates: defaultWorkflowChannel(true, true),
      abandonedCart: defaultWorkflowChannel(true, true, { delayHours: 2 }),
      supportRequestAdminAlert: defaultWorkflowChannel(true, true),
      customerNotifications: defaultWorkflowChannel(true, true),
    } as any;
  }
  await settings.save();
  return settings;
}

