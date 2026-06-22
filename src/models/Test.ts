import mongoose, { Schema } from 'mongoose';
import { ITest } from '../types';

const TestSchema: Schema = new Schema(
  {
    testName: {
      type: String,
      required: [true, 'Test name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Test price is required'],
      min: 0,
    },
    offerPrice: {
      type: Number,
      min: 0,
    },
    discountType: {
      type: String,
      enum: ['FLAT', 'PERCENTAGE', 'NONE'],
      default: 'NONE',
    },
    discountValue: {
      type: Number,
      min: 0,
      default: 0,
    },
    turnAroundTime: {
      type: String,
      trim: true,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    applicableCategories: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    isApplicableToAll: {
      type: Boolean,
      default: false,
    },
    creatorType: {
      type: String,
      enum: ['ADMIN', 'LAB'],
      default: 'ADMIN',
    },
    labId: {
      type: Schema.Types.ObjectId,
      ref: 'Laboratory',
    },
    approvalStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'APPROVED',
    },
    rejectionReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ITest>('Test', TestSchema);
