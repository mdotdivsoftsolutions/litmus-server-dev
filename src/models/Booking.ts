import mongoose, { Schema } from 'mongoose';
import { IBooking, BookingStatus, PaymentStatus, CollectionStatus } from '../types';

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
      // Optional: because "Litmus Smart Allocation" means no lab is assigned yet
    },
    items: [
      {
        itemType: {
          type: String,
          enum: ['TEST', 'PACKAGE'],
          required: true,
        },
        testId: {
          type: Schema.Types.ObjectId,
          ref: 'Test',
        },
        packageId: {
          type: Schema.Types.ObjectId,
          ref: 'Package',
        },
        price: {
          type: Number,
          required: true,
        },
        mrp: {
          type: Number,
          required: true,
        },
        samples: [
          {
            productName: { type: String, required: true },
            quantity: { type: String },
            batchNumber: { type: String },
            sku: { type: String },
            specifics: { type: String },
            selectedParameters: [{ type: String }],
            selectedTests: [{ type: String }],
          }
        ]
      }
    ],
    totalAmount: {
      type: Number,
    },
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
    collectionStatus: {
      type: String,
      enum: Object.values(CollectionStatus),
      default: CollectionStatus.PENDING,
    },
    collectionMethod: {
      type: String,
      enum: ['PICKUP', 'COURIER'],
    },
    courierDetails: {
      trackingId: { type: String },
      courierName: { type: String },
      notes: { type: String },
      submittedAt: { type: Date },
    },
    assignedCollector: {
      name: { type: String },
      contact: { type: String }
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
