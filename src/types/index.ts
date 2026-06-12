import mongoose, { Document } from 'mongoose';

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  LAB = 'LAB',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  documents?: string[];
  address?: any;
  fssaiNumber?: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface JwtPayload {
  id: string;
  role: UserRole;
}

export interface ILaboratory extends Document {
  labName: string;
  userId?: mongoose.Types.ObjectId;
  contactEmail?: string;
  contactPhone?: string;
  isNablAccredited?: boolean;
  isFssaiApproved?: boolean;
  isTrusted?: boolean;
  nablAccreditationNumber?: string;
  location: any;
  tests: mongoose.Types.ObjectId[];
  pricing: any;
  availability: any;
  isAutoBooking: boolean;
  requiresAdminApprovalForReport: boolean;
  dailyLimit: number;
  metadata?: any;
  startingYear?: number;
  affiliationDocs?: string[];
  expertiseArea?: string[];
  additionalDetails?: string;
  isDeleted?: boolean;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICategory extends Document {
  name: string;
  description?: string;
  imageUrl?: string;
  productCount?: number;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProduct extends Document {
  name: string;
  categoryId: mongoose.Types.ObjectId;
  description?: string;
  imageUrl?: string;
  fssaiReference?: string;
  isActive: boolean;
  availableTests: mongoose.Types.ObjectId[];
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITest extends Document {
  testName: string;
  description?: string;
  price: number;
  offerPrice?: number;
  turnAroundTime?: string;
  isPopular?: boolean;
  metadata?: any;
  applicableCategories?: mongoose.Types.ObjectId[];
  isApplicableToAll: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBooking extends Document {
  userId: mongoose.Types.ObjectId;
  labId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  selectedTests: mongoose.Types.ObjectId[];
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  bookingDate: Date;
  reportFiles?: string[];
  isReportApprovedByAdmin: boolean;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPayment extends Document {
  bookingId: mongoose.Types.ObjectId;
  amount: number;
  transactionId?: string;
  status: PaymentStatus;
  method: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReview extends Document {
  name: string;
  city: string;
  rating: number;
  text: string;
  dateText?: string;
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPackage extends Document {
  name: string;
  description: string;
  testCount: number;
  price: number;
  mrp: number;
  tat: string;
  category: string;
  categoryId?: mongoose.Types.ObjectId;
  tests?: mongoose.Types.ObjectId[];
  discountType?: 'PERCENTAGE' | 'FLAT';
  discountValue?: number;
  tag?: string;
  features: string[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
