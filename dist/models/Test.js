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
const TestSchema = new mongoose_1.Schema({
    testName: {
        type: String,
        required: [true, 'Test name is required'],
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    imageUrl: {
        type: String,
        trim: true,
    },
    icon: {
        type: String,
        trim: true,
    },
    price: {
        type: Number,
        required: [true, 'Test price is required'],
        min: 0,
    },
    offerPrice: {
        type: Number,
        min: 0,
    },
    discountType: {
        type: String,
        enum: ['FLAT', 'PERCENTAGE', 'NONE'],
        default: 'NONE',
    },
    discountValue: {
        type: Number,
        min: 0,
        default: 0,
    },
    turnAroundTime: {
        type: String,
        trim: true,
    },
    isPopular: {
        type: Boolean,
        default: false,
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
    },
    applicableCategories: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Category',
        },
    ],
    isApplicableToAll: {
        type: Boolean,
        default: false,
    },
    creatorType: {
        type: String,
        enum: ['ADMIN', 'LAB'],
        default: 'ADMIN',
    },
    labId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Laboratory',
    },
    approvalStatus: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'APPROVED',
    },
    rejectionReason: {
        type: String,
    },
}, {
    timestamps: true,
});
exports.default = mongoose_1.default.model('Test', TestSchema);
