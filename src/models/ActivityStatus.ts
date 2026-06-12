import mongoose, { Schema, Document } from 'mongoose';

export interface IActivityStatus extends Document {
  name: string;
}

const ActivityStatusSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
}, {
  timestamps: true,
});

export default mongoose.model<IActivityStatus>('ActivityStatus', ActivityStatusSchema);
