import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import { IUser, UserRole, Permission } from '../types';

const UserSchema: Schema = new Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: false,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false, // Don't return password by default
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
    },
    permissions: [{
      type: String,
      enum: Object.values(Permission),
    }],
    labId: {
      type: Schema.Types.ObjectId,
      ref: 'Laboratory',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
      default: Date.now,
    },
    documents: [{
      name: String,
      url: String,
      docType: String,
      status: { type: String, default: 'Pending' },
      size: String
    }],
    address: {
      type: Schema.Types.Mixed,
    },
    billingAddress: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: 'India' },
    },
    shippingAddress: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: 'India' },
    },
    profilePic: {
      type: String,
      trim: true,
    },
    designation: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    fssaiNumber: {
      type: String,
      trim: true,
    },
    gstNumber: {
      type: String,
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    industryCategory: {
      type: String,
      trim: true,
      default: 'General Food & Beverage',
    },
    customerSegment: {
      type: String,
      enum: ['INDIVIDUAL', 'FOOD_BUSINESS', 'ENTERPRISE', 'LAB_PARTNER'],
      default: 'INDIVIDUAL',
    },
    alternatePhone: {
      type: String,
      trim: true,
    },
    kycStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'PENDING',
    },
    kycVerifiedAt: {
      type: Date,
    },
    adminNotes: [{
      note: { type: String, required: true },
      authorId: { type: String },
      authorName: { type: String },
      createdAt: { type: Date, default: Date.now },
    }],
    notifications: {
      email: {
        type: Boolean,
        default: true,
      },
      whatsapp: {
        type: Boolean,
        default: true,
      },
      promo: {
        type: Boolean,
        default: false,
      },
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Encrypt password before saving
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password as string, salt);
});

// Method to compare entered password with hashed password in DB
UserSchema.methods.comparePassword = async function (enteredPassword: string): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);
