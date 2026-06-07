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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ITest>('Test', TestSchema);
