import mongoose, { Document, Schema } from 'mongoose';

export interface IPlatformSettings extends Document {
  pickupCities: string[];
}

const platformSettingsSchema = new Schema(
  {
    pickupCities: {
      type: [String],
      default: ['Chennai'],
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
