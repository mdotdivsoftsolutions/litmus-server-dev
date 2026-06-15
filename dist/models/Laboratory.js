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
const LaboratorySchema = new mongoose_1.Schema({
    labName: {
        type: String,
        required: [true, 'Laboratory name is required'],
        trim: true,
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        description: 'The user account (Role: LAB) that owns this laboratory',
    },
    contactEmail: {
        type: String,
        trim: true,
    },
    contactPhone: {
        type: String,
        trim: true,
    },
    isNablAccredited: {
        type: Boolean,
        default: false,
    },
    isFssaiApproved: {
        type: Boolean,
        default: false,
    },
    isTrusted: {
        type: Boolean,
        default: false,
    },
    nablAccreditationNumber: {
        type: String,
        trim: true,
    },
    location: {
        type: mongoose_1.Schema.Types.Mixed,
        required: [true, 'Location is required'],
    },
    tests: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Test',
        },
    ],
    pricing: {
        type: mongoose_1.Schema.Types.Mixed,
    },
    availability: {
        type: mongoose_1.Schema.Types.Mixed,
    },
    isAutoBooking: {
        type: Boolean,
        default: false,
    },
    requiresAdminApprovalForReport: {
        type: Boolean,
        default: true,
    },
    dailyLimit: {
        type: Number,
        default: 0,
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
    },
    reviewCount: {
        type: Number,
        default: 0,
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
    },
    startingYear: {
        type: Number,
    },
    affiliationDocs: [{
            type: String,
        }],
    expertiseArea: {
        type: [String],
        validate: [
            (val) => val.length <= 4,
            'Cannot exceed 4 expertise areas'
        ]
    },
    additionalDetails: {
        type: String,
    },
    overview: {
        type: String,
    },
    employeeCount: {
        type: Number,
        default: 0,
    },
    accuracyRate: {
        type: Number,
    },
    testsConducted: {
        type: Number,
        default: 0,
    },
    infrastructure: [{
            title: String,
            description: String,
            icon: String,
        }],
    serviceAreaLogistics: [{
            type: String,
        }],
    activityStatus: {
        type: String,
        default: 'Operational Now',
    },
    reviews: [{
            reviewerName: String,
            reviewerRole: String,
            userImage: String,
            rating: { type: Number, min: 0, max: 5 },
            comment: String,
            isVerified: { type: Boolean, default: false },
            date: String,
        }],
    isDeleted: {
        type: Boolean,
        default: false,
    },
    isActive: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});
exports.default = mongoose_1.default.model('Laboratory', LaboratorySchema);
