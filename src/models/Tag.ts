import mongoose, { Schema, Document } from 'mongoose';

export interface ITag extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const TagSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Tag name is required'],
      trim: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ITag>('Tag', TagSchema);
