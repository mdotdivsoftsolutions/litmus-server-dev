import mongoose, { Document, Schema } from 'mongoose';

export interface IConsultation extends Document {
  name: string;
  business?: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  serviceName: string;
  source: string;
  message?: string;
  status: 'Pending' | 'Contacted' | 'Resolved';
  createdAt: Date;
  updatedAt: Date;
}

const consultationSchema = new Schema<IConsultation>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    business: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    serviceName: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Contacted', 'Resolved'],
      default: 'Pending',
    },
  },
  {
    timestamps: true,
  }
);

export const Consultation = mongoose.model<IConsultation>('Consultation', consultationSchema);
