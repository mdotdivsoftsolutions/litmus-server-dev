import mongoose, { Document, Schema } from 'mongoose';

export interface IPlatformSettings extends Document {
  pickupCities: string[];
  enablePickupSlotSelection: boolean;
}

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
  },
  { timestamps: true }
);

export const PlatformSettings = mongoose.model<IPlatformSettings>('PlatformSettings', platformSettingsSchema);

export async function getPlatformSettings() {
  let settings = await PlatformSettings.findOne();
  if (!settings) {
    settings = await PlatformSettings.create({ pickupCities: ['Chennai'] });
  }
  if (!settings.pickupCities || settings.pickupCities.length === 0) {
    settings.pickupCities = ['Chennai'];
    await settings.save();
  }
  return settings;
}
