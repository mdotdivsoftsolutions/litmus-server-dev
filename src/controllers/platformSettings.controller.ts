import { Request, Response } from 'express';
import { getPlatformSettings } from '../models/PlatformSettings';

export const getPublicSettings = async (_req: Request, res: Response) => {
  try {
    const settings = await getPlatformSettings();
    res.status(200).json({
      success: true,
      data: {
        pickupCities: settings.pickupCities,
        enablePickupSlotSelection: settings.enablePickupSlotSelection ?? false,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAdminSettings = async (_req: Request, res: Response) => {
  try {
    const settings = await getPlatformSettings();
    res.status(200).json({
      success: true,
      data: settings,
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

    await settings.save();

    res.status(200).json({
      success: true,
      data: settings,
      message: 'Platform settings updated',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
