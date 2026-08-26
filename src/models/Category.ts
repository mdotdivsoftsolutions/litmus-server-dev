import mongoose, { Schema } from 'mongoose';
import { ICategory } from '../types';

const CategorySchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    imageUrl: {
      type: String,
    },
    subcategories: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        slug: {
          type: String,
          trim: true,
        },
        description: {
          type: String,
          trim: true,
        },
        imageUrl: {
          type: String,
          trim: true,
        },
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

export default mongoose.model<ICategory>('Category', CategorySchema);
