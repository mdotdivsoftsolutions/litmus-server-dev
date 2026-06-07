import mongoose, { Schema } from 'mongoose';
import { IPayment, PaymentStatus } from '../types';

const PaymentSchema: Schema = new Schema(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: 0,
    },
    transactionId: {
      type: String,
      unique: true,
      sparse: true, // Only unique if it exists
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
    method: {
      type: String,
      required: [true, 'Payment method is required'],
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IPayment>('Payment', PaymentSchema);
