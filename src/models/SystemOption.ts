import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemOption extends Document {
  category: 'DEPARTMENT' | 'DESIGNATION';
  value: string;
  isActive: boolean;
}

const systemOptionSchema = new Schema(
  {
    category: {
      type: String,
      enum: ['DEPARTMENT', 'DESIGNATION'],
      required: true,
      index: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure uniqueness per category and value combination
systemOptionSchema.index({ category: 1, value: 1 }, { unique: true });

export const SystemOption = mongoose.model<ISystemOption>('SystemOption', systemOptionSchema);
