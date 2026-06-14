import mongoose, { Schema } from 'mongoose';
import { ICart, ICartItem } from '../types';

const CartItemSchema = new Schema<ICartItem>({
  itemType: {
    type: String,
    enum: ['TEST', 'PACKAGE'],
    required: true,
  },
  testId: {
    type: Schema.Types.ObjectId,
    ref: 'Test',
  },
  packageId: {
    type: Schema.Types.ObjectId,
    ref: 'Package',
  },
  parameters: [{
    type: String,
  }],
  price: {
    type: Number,
    required: true,
  },
  mrp: {
    type: Number,
    required: true,
  },
});

const CartSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    sessionId: {
      type: String,
    },
    items: [CartItemSchema],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ICart>('Cart', CartSchema);
