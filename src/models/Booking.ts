import mongoose, { Schema } from 'mongoose';
import { IBooking, BookingStatus, PaymentStatus } from '../types';

const BookingSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    labId: {
      type: Schema.Types.ObjectId,
      ref: 'Laboratory',
      required: [true, 'Lab ID is required'],
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    selectedTests: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Test',
      },
    ],
    status: {
      type: String,
      enum: Object.values(BookingStatus),
      default: BookingStatus.PENDING,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
    bookingDate: {
      type: Date,
      required: [true, 'Booking date is required'],
    },
    reportFiles: [
      {
        type: String, // URLs to report files
      },
    ],
    isReportApprovedByAdmin: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IBooking>('Booking', BookingSchema);
