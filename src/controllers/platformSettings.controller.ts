import { Request, Response } from 'express';
import { getPlatformSettings } from '../models/PlatformSettings';
import { WhatsAppService } from '../services/whatsapp.service';
import { runAbandonedCartScan } from '../jobs/abandonedCart.job';

export const getPublicSettings = async (_req: Request, res: Response) => {
  try {
    const settings = await getPlatformSettings();
    res.status(200).json({
      success: true,
      data: {
        pickupCities: settings.pickupCities,
        enablePickupSlotSelection: settings.enablePickupSlotSelection ?? false,
        courierAddress: settings.courierAddress,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAdminSettings = async (_req: Request, res: Response) => {
  try {
    const settings = await getPlatformSettings();
    const isWhatsAppConfigured = WhatsAppService.isConfigured();
    res.status(200).json({
      success: true,
      data: settings,
      meta: {
        isWhatsAppConfigured,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAdminSettings = async (req: Request, res: Response) => {
  try {
    const settings = await getPlatformSettings();

    if (req.body.pickupCities !== undefined) {
      const pickupCities: string[] = Array.isArray(req.body.pickupCities)
        ? req.body.pickupCities
            .map((city: unknown) => String(city).trim())
            .filter((city) => city.length > 0)
        : [];

      if (pickupCities.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Add at least one city where pickup service is available.',
        });
        return;
      }

      const uniqueCities: string[] = [...new Set(pickupCities)];
      settings.pickupCities = uniqueCities;
    }

    if (typeof req.body.enablePickupSlotSelection === 'boolean') {
      settings.enablePickupSlotSelection = req.body.enablePickupSlotSelection;
    }

    if (req.body.adminWhatsAppNumber !== undefined) {
      settings.adminWhatsAppNumber = String(req.body.adminWhatsAppNumber).trim();
    }

    if (req.body.adminEmailRecipient !== undefined) {
      settings.adminEmailRecipient = String(req.body.adminEmailRecipient).trim();
    }

    if (req.body.courierAddress && typeof req.body.courierAddress === 'object') {
      settings.courierAddress = {
        ...settings.courierAddress,
        ...req.body.courierAddress,
      };
      settings.markModified('courierAddress');
    }

    if (req.body.notificationWorkflows && typeof req.body.notificationWorkflows === 'object') {
      settings.notificationWorkflows = {
        ...settings.notificationWorkflows,
        ...req.body.notificationWorkflows,
      };
      settings.markModified('notificationWorkflows');
    }

    await settings.save();

    res.status(200).json({
      success: true,
      data: settings,
      meta: {
        isWhatsAppConfigured: WhatsAppService.isConfigured(),
      },
      message: 'Platform & Notification settings updated successfully',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const testWhatsAppNotification = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, message, useTemplate, templateName } = req.body;
    const settings = await getPlatformSettings();
    const targetPhone = phoneNumber || settings.adminWhatsAppNumber || process.env.ADMIN_WHATSAPP_NUMBER || '+919876543210';

    let result;
    if (useTemplate) {
      result = await WhatsAppService.sendTemplateMessage(targetPhone, templateName || 'hello_world', 'en_US');
    } else {
      const testMessage = message || [
        `🔔 *LITMUS DIAGNOSTICS - WHATSAPP INTEGRATION TEST*`,
        `━━━━━━━━━━━━━━━━━━━━━`,
        `This is a test notification from the Litmus Admin Panel to verify that WhatsApp Business Cloud API workflows and live dispatch are active and functioning correctly.`,
        ``,
        `⏰ *Sent At:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
        `━━━━━━━━━━━━━━━━━━━━━`,
      ].join('\n');

      result = await WhatsAppService.sendTextMessage(targetPhone, testMessage);
      
      // If direct text failed, try sending official hello_world template
      if (!result.success) {
        const templateResult = await WhatsAppService.sendTemplateMessage(targetPhone, 'hello_world', 'en_US');
        if (templateResult.success) {
          result = templateResult;
        }
      }
    }

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.mocked
          ? `Test notification simulated in Dev/Mock mode for ${targetPhone}`
          : `Test WhatsApp notification sent successfully to ${targetPhone}`,
        data: {
          recipient: targetPhone,
          mocked: result.mocked || false,
          messageId: result.messageId,
          configured: WhatsAppService.isConfigured(),
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to dispatch test WhatsApp message',
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const triggerAbandonedCartScan = async (_req: Request, res: Response) => {
  try {
    const result = await runAbandonedCartScan();
    res.status(200).json({
      success: true,
      message: `Abandoned cart scan complete. Scanned ${result.scanned} carts and sent ${result.notified} reminders.`,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
