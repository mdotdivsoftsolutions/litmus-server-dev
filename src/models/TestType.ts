import mongoose, { Schema, Document } from 'mongoose';

export interface ITestType extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const TestTypeSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Test Type name is required'],
      trim: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ITestType>('TestType', TestTypeSchema);
