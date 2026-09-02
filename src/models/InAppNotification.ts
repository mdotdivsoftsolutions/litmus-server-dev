import mongoose, { Document, Schema } from 'mongoose';

export type NotificationRecipientRole = 'ADMIN' | 'LAB' | 'USER';

export type NotificationType =
  | 'NEW_LAB_ONBOARDING'
  | 'NEW_BOOKING'
  | 'BOOKING_ASSIGNED'
  | 'LAB_UPDATE'
  | 'REPORT_UPLOADED'
  | 'SUPPORT_REQUEST'
  | 'SYSTEM';

export interface IInAppNotification extends Document {
  recipientRole: NotificationRecipientRole;
  recipientLabId?: mongoose.Types.ObjectId;
  recipientUserId?: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InAppNotificationSchema = new Schema<IInAppNotification>(
  {
    recipientRole: {
      type: String,
      enum: ['ADMIN', 'LAB', 'USER'],
      required: true,
      index: true,
    },
    recipientLabId: {
      type: Schema.Types.ObjectId,
      ref: 'Laboratory',
      index: true,
    },
    recipientUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    type: {
      type: String,
      enum: [
        'NEW_LAB_ONBOARDING',
        'NEW_BOOKING',
        'BOOKING_ASSIGNED',
        'LAB_UPDATE',
        'REPORT_UPLOADED',
        'SUPPORT_REQUEST',
        'SYSTEM',
      ],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    link: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// High-speed compound index for role/lab notification queries
InAppNotificationSchema.index({ recipientRole: 1, recipientLabId: 1, isRead: 1, createdAt: -1 });

export const InAppNotification = mongoose.model<IInAppNotification>(
  'InAppNotification',
  InAppNotificationSchema
);
export default InAppNotification;
