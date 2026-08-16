import { Request, Response } from 'express';
import { getPlatformSettings } from '../models/PlatformSettings';

export const getPublicSettings = async (_req: Request, res: Response) => {
  try {
    const settings = await getPlatformSettings();
    res.status(200).json({
      success: true,
      data: {
        pickupCities: settings.pickupCities,
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
    const pickupCities = Array.isArray(req.body.pickupCities)
      ? req.body.pickupCities
          .map((city: string) => String(city).trim())
          .filter(Boolean)
      : [];

    if (pickupCities.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Add at least one city where pickup service is available.',
      });
      return;
    }

    const uniqueCities = [...new Set(pickupCities)];
    const settings = await getPlatformSettings();
    settings.pickupCities = uniqueCities;
    await settings.save();

    res.status(200).json({
      success: true,
      data: settings,
      message: 'Pickup coverage updated',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
