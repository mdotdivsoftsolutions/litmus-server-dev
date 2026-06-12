import mongoose, { Schema, Document } from 'mongoose';

export interface ILogisticsOption extends Document {
  name: string;
}

const LogisticsOptionSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
}, { timestamps: true });

export default mongoose.model<ILogisticsOption>('LogisticsOption', LogisticsOptionSchema);
