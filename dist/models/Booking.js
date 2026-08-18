"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
const BookingSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
    },
    labId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Test',
            },
            packageId: {
                type: mongoose_1.Schema.Types.ObjectId,
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
        enum: Object.values(types_1.BookingStatus),
        default: types_1.BookingStatus.PENDING,
    },
    paymentStatus: {
        type: String,
        enum: Object.values(types_1.PaymentStatus),
        default: types_1.PaymentStatus.PENDING,
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
    reportSummary: {
        summary: { type: String, default: '' },
        recommendations: { type: String, default: '' },
        tips: { type: String, default: '' },
        additionalNotes: { type: String, default: '' },
        updatedAt: { type: Date },
        updatedByRole: { type: String, enum: ['LAB', 'ADMIN'] },
    },
    isReportApprovedByAdmin: {
        type: Boolean,
        default: false,
    },
    collectionStatus: {
        type: String,
        enum: Object.values(types_1.CollectionStatus),
        default: types_1.CollectionStatus.PENDING,
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
    invoiceNumber: {
        type: String,
        sparse: true,
        index: true,
    },
    invoiceDate: {
        type: Date,
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
    },
}, {
    timestamps: true,
});
exports.default = mongoose_1.default.model('Booking', BookingSchema);
