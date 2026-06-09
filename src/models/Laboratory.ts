import mongoose, { Schema } from 'mongoose';
import { ILaboratory } from '../types';

const LaboratorySchema: Schema = new Schema(
  {
    labName: {
      type: String,
      required: [true, 'Laboratory name is required'],
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      description: 'The user account (Role: LAB) that owns this laboratory',
    },
    contactEmail: {
      type: String,
      trim: true,
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    isNablAccredited: {
      type: Boolean,
      default: false,
    },
    isFssaiApproved: {
      type: Boolean,
      default: false,
    },
    isTrusted: {
      type: Boolean,
      default: false,
    },
    nablAccreditationNumber: {
      type: String,
      trim: true,
    },
    location: {
      type: Schema.Types.Mixed,
      required: [true, 'Location is required'],
    },
    tests: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Test',
      },
    ],
    pricing: {
      type: Schema.Types.Mixed,
    },
    availability: {
      type: Schema.Types.Mixed,
    },
    isAutoBooking: {
      type: Boolean,
      default: false,
    },
    requiresAdminApprovalForReport: {
      type: Boolean,
      default: true,
    },
    dailyLimit: {
      type: Number,
      default: 0,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    startingYear: {
      type: Number,
    },
    affiliationDocs: [{
      type: String,
    }],
    additionalDetails: {
      type: String,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ILaboratory>('Laboratory', LaboratorySchema);
