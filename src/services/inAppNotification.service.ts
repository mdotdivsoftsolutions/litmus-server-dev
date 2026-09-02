import mongoose from 'mongoose';
import InAppNotification, {
  IInAppNotification,
  NotificationRecipientRole,
  NotificationType,
} from '../models/InAppNotification';
import logger from '../utils/logger';

export interface CreateNotificationPayload {
  recipientRole: NotificationRecipientRole;
  recipientLabId?: string | mongoose.Types.ObjectId;
  recipientUserId?: string | mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}

export interface GetNotificationsOptions {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  type?: string;
}

export class InAppNotificationService {
  /**
   * Dispatches a new in-app notification to the database.
   */
  public static async createNotification(
    payload: CreateNotificationPayload
  ): Promise<IInAppNotification | null> {
    try {
      const notification = await InAppNotification.create({
        recipientRole: payload.recipientRole,
        recipientLabId: payload.recipientLabId
          ? new mongoose.Types.ObjectId(payload.recipientLabId.toString())
          : undefined,
        recipientUserId: payload.recipientUserId
          ? new mongoose.Types.ObjectId(payload.recipientUserId.toString())
          : undefined,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        link: payload.link,
        metadata: payload.metadata || {},
      });

      logger.info(
        `[InAppNotification] Created ${payload.type} notification for role ${payload.recipientRole}`
      );
      return notification;
    } catch (error: any) {
      logger.error(`[InAppNotification] Error creating notification: ${error.message}`, error);
      return null;
    }
  }

  /**
   * Retrieves notifications with pagination, scoped by recipient criteria.
   */
  public static async getNotifications(
    criteria: {
      role: NotificationRecipientRole;
      labId?: string;
      userId?: string;
    },
    options: GetNotificationsOptions = {}
  ) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(options.limit) || 15));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {
      recipientRole: criteria.role,
    };

    if (criteria.role === 'LAB') {
      if (!criteria.labId) {
        return { notifications: [], total: 0, page, totalPages: 0, unreadCount: 0 };
      }
      query.recipientLabId = new mongoose.Types.ObjectId(criteria.labId);
    } else if (criteria.role === 'USER') {
      if (!criteria.userId) {
        return { notifications: [], total: 0, page, totalPages: 0, unreadCount: 0 };
      }
      query.recipientUserId = new mongoose.Types.ObjectId(criteria.userId);
    }

    if (options.unreadOnly) {
      query.isRead = false;
    }

    if (options.type && options.type.trim()) {
      query.type = options.type.trim();
    }

    const [notifications, total, unreadCount] = await Promise.all([
      InAppNotification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      InAppNotification.countDocuments(query),
      InAppNotification.countDocuments({
        ...query,
        isRead: false,
      }),
    ]);

    return {
      notifications,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    };
  }

  /**
   * Gets unread notification count for a specific user/lab/admin.
   */
  public static async getUnreadCount(
    role: NotificationRecipientRole,
    labId?: string,
    userId?: string
  ): Promise<number> {
    const query: Record<string, any> = {
      recipientRole: role,
      isRead: false,
    };

    if (role === 'LAB' && labId) {
      query.recipientLabId = new mongoose.Types.ObjectId(labId);
    } else if (role === 'USER' && userId) {
      query.recipientUserId = new mongoose.Types.ObjectId(userId);
    }

    return InAppNotification.countDocuments(query);
  }

  /**
   * Marks a single notification as read.
   */
  public static async markAsRead(
    notificationId: string,
    context: { role: NotificationRecipientRole; labId?: string; userId?: string }
  ): Promise<IInAppNotification | null> {
    const query: Record<string, any> = {
      _id: new mongoose.Types.ObjectId(notificationId),
      recipientRole: context.role,
    };

    if (context.role === 'LAB' && context.labId) {
      query.recipientLabId = new mongoose.Types.ObjectId(context.labId);
    } else if (context.role === 'USER' && context.userId) {
      query.recipientUserId = new mongoose.Types.ObjectId(context.userId);
    }

    return InAppNotification.findOneAndUpdate(
      query,
      { isRead: true, readAt: new Date() },
      { new: true }
    );
  }

  /**
   * Marks all unread notifications as read.
   */
  public static async markAllAsRead(context: {
    role: NotificationRecipientRole;
    labId?: string;
    userId?: string;
  }): Promise<number> {
    const query: Record<string, any> = {
      recipientRole: context.role,
      isRead: false,
    };

    if (context.role === 'LAB' && context.labId) {
      query.recipientLabId = new mongoose.Types.ObjectId(context.labId);
    } else if (context.role === 'USER' && context.userId) {
      query.recipientUserId = new mongoose.Types.ObjectId(context.userId);
    }

    const result = await InAppNotification.updateMany(query, {
      isRead: true,
      readAt: new Date(),
    });

    return result.modifiedCount;
  }

  /**
   * Deletes a notification item.
   */
  public static async deleteNotification(
    notificationId: string,
    context: { role: NotificationRecipientRole; labId?: string; userId?: string }
  ): Promise<boolean> {
    const query: Record<string, any> = {
      _id: new mongoose.Types.ObjectId(notificationId),
      recipientRole: context.role,
    };

    if (context.role === 'LAB' && context.labId) {
      query.recipientLabId = new mongoose.Types.ObjectId(context.labId);
    } else if (context.role === 'USER' && context.userId) {
      query.recipientUserId = new mongoose.Types.ObjectId(context.userId);
    }

    const result = await InAppNotification.deleteOne(query);
    return result.deletedCount > 0;
  }
}

export default InAppNotificationService;
