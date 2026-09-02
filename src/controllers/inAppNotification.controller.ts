import { Request, Response } from 'express';
import { InAppNotificationService } from '../services/inAppNotification.service';
import { NotificationRecipientRole } from '../models/InAppNotification';
import { UserRole } from '../types';
import logger from '../utils/logger';

const getContextFromRequest = (req: Request) => {
  const user = req.user;
  if (!user) {
    throw new Error('Unauthorized');
  }

  let role: NotificationRecipientRole = 'USER';
  if (user.role === UserRole.ADMIN || user.role === UserRole.EMPLOYEE) {
    role = 'ADMIN';
  } else if (user.role === UserRole.LAB || user.role === UserRole.LAB_EMPLOYEE) {
    role = 'LAB';
  }

  return {
    role,
    labId: user.labId,
    userId: user.id,
  };
};


export class InAppNotificationController {
  /**
   * GET /api/notifications
   * Fetches paginated notifications for the current authenticated user/role.
   */
  public static async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const context = getContextFromRequest(req);
      const { page, limit, unreadOnly, type } = req.query;

      const result = await InAppNotificationService.getNotifications(context, {
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 15,
        unreadOnly: unreadOnly === 'true' || unreadOnly === '1',
        type: type ? String(type) : undefined,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error(`[InAppNotificationController] getNotifications error: ${error.message}`);
      res.status(error.message === 'Unauthorized' ? 401 : 500).json({
        success: false,
        message: error.message || 'Failed to fetch notifications',
      });
    }
  }

  /**
   * GET /api/notifications/unread-count
   * Returns current unread notification count.
   */
  public static async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const context = getContextFromRequest(req);
      const unreadCount = await InAppNotificationService.getUnreadCount(
        context.role,
        context.labId,
        context.userId
      );

      res.status(200).json({
        success: true,
        data: { unreadCount },
      });
    } catch (error: any) {
      logger.error(`[InAppNotificationController] getUnreadCount error: ${error.message}`);
      res.status(error.message === 'Unauthorized' ? 401 : 500).json({
        success: false,
        message: error.message || 'Failed to get unread count',
      });
    }
  }

  /**
   * PATCH /api/notifications/:id/read
   * Marks a specific notification as read.
   */
  public static async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const context = getContextFromRequest(req);
      const id = String(req.params.id);

      const notification = await InAppNotificationService.markAsRead(id, context);
      if (!notification) {
        res.status(404).json({
          success: false,
          message: 'Notification not found or already read',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: notification,
      });
    } catch (error: any) {
      logger.error(`[InAppNotificationController] markAsRead error: ${error.message}`);
      res.status(error.message === 'Unauthorized' ? 401 : 500).json({
        success: false,
        message: error.message || 'Failed to mark notification as read',
      });
    }
  }

  /**
   * PATCH /api/notifications/mark-all-read
   * Marks all unread notifications for current portal as read.
   */
  public static async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const context = getContextFromRequest(req);
      const modifiedCount = await InAppNotificationService.markAllAsRead(context);

      res.status(200).json({
        success: true,
        data: { modifiedCount },
        message: 'All notifications marked as read',
      });
    } catch (error: any) {
      logger.error(`[InAppNotificationController] markAllAsRead error: ${error.message}`);
      res.status(error.message === 'Unauthorized' ? 401 : 500).json({
        success: false,
        message: error.message || 'Failed to mark all notifications as read',
      });
    }
  }

  /**
   * DELETE /api/notifications/:id
   * Deletes a notification item.
   */
  public static async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      const context = getContextFromRequest(req);
      const id = String(req.params.id);

      const deleted = await InAppNotificationService.deleteNotification(id, context);
      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Notification not found',
        });
        return;
      }


      res.status(200).json({
        success: true,
        message: 'Notification deleted successfully',
      });
    } catch (error: any) {
      logger.error(`[InAppNotificationController] deleteNotification error: ${error.message}`);
      res.status(error.message === 'Unauthorized' ? 401 : 500).json({
        success: false,
        message: error.message || 'Failed to delete notification',
      });
    }
  }
}

export default InAppNotificationController;
