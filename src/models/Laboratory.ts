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
    packages: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Package',
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
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
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
    expertiseArea: {
      type: [String],
      validate: [
        (val: string[]) => val.length <= 4,
        'Cannot exceed 4 expertise areas'
      ]
    },
    additionalDetails: {
      type: String,
    },
    overview: {
      type: String,
    },
    employeeCount: {
      type: Number,
      default: 0,
    },
    accuracyRate: {
      type: Number,
    },
    testsConducted: {
      type: Number,
      default: 0,
    },
    infrastructure: [{
      title: String,
      description: String,
      icon: String,
    }],
    serviceAreaLogistics: [{
      type: String,
    }],
    activityStatus: {
      type: String,
      default: 'Operational Now',
    },
    reviews: [{
      reviewerName: String,
      reviewerRole: String,
      userImage: String,
      rating: { type: Number, min: 0, max: 5 },
      comment: String,
      isVerified: { type: Boolean, default: false },
      date: String,
    }],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ILaboratory>('Laboratory', LaboratorySchema);
