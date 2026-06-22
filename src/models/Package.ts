import mongoose, { Schema } from 'mongoose';
import { IPackage } from '../types';

const PackageSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Package name is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Package description is required'],
      trim: true,
    },
    testCount: {
      type: Number,
      required: [true, 'Test count is required'],
      min: 0,
    },
    price: {
      type: Number,
      required: [true, 'Litmus price is required'],
      min: 0,
    },
    mrp: {
      type: Number,
      required: [true, 'Original price (MRP) is required'],
      min: 0,
    },
    tat: {
      type: String,
      required: [true, 'Turnaround time (TAT) is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },
    tests: [{
      type: Schema.Types.ObjectId,
      ref: 'Test',
    }],
    discountType: {
      type: String,
      enum: ['PERCENTAGE', 'FLAT'],
      default: 'PERCENTAGE',
    },
    discountValue: {
      type: Number,
      default: 0,
    },
    tag: {
      type: String,
      trim: true,
    },
    features: {
      type: [String],
      default: [],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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

export default mongoose.model<IPackage>('Package', PackageSchema);
