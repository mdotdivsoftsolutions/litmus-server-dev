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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ITest>('Test', TestSchema);
