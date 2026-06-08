import mongoose, { Schema } from 'mongoose';
import { IProduct } from '../types';

const ProductSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category ID is required'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageUrl: {
      type: String,
    },
    fssaiReference: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    availableTests: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Test',
      },
    ],
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IProduct>('Product', ProductSchema);
