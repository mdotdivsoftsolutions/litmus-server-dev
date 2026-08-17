import mongoose, { Document } from 'mongoose';

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  LAB = 'LAB',
  EMPLOYEE = 'EMPLOYEE',
  LAB_EMPLOYEE = 'LAB_EMPLOYEE',
}

export enum Permission {
  MANAGE_EMPLOYEES = 'MANAGE_EMPLOYEES',
  MANAGE_LABS = 'MANAGE_LABS',
  MANAGE_USERS = 'MANAGE_USERS',
  VIEW_BOOKINGS = 'VIEW_BOOKINGS',
  MANAGE_BOOKINGS = 'MANAGE_BOOKINGS',
  VIEW_PRICING = 'VIEW_PRICING',
  VIEW_LEADS = 'VIEW_LEADS',
  MANAGE_LAB_PROFILE = 'MANAGE_LAB_PROFILE',
  MANAGE_LAB_EMPLOYEES = 'MANAGE_LAB_EMPLOYEES',
  VIEW_LAB_BOOKINGS = 'VIEW_LAB_BOOKINGS',
  MANAGE_LAB_BOOKINGS = 'MANAGE_LAB_BOOKINGS',
  MANAGE_LAB_TESTS = 'MANAGE_LAB_TESTS',
  MANAGE_LAB_PACKAGES = 'MANAGE_LAB_PACKAGES',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum CollectionStatus {
  NOT_REQUIRED = 'NOT_REQUIRED',
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  REACHED = 'REACHED',
  COLLECTED = 'COLLECTED',
  SHIPPED = 'SHIPPED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUND_INITIATED = 'REFUND_INITIATED',
  REFUNDED = 'REFUNDED',
}

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  phone: string;
  role: UserRole;
  permissions?: string[];
  labId?: mongoose.Types.ObjectId;
  isActive: boolean;
  lastLoginAt?: Date;
  profilePic?: string;
  designation?: string;
  department?: string;
  documents?: {
    name: string;
    url: string;
    docType: string;
    status: string;
    size?: string;
  }[];
  address?: any;
  fssaiNumber?: string;
  companyName?: string;
  notifications?: {
    email: boolean;
    whatsapp: boolean;
    promo: boolean;
  };
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface JwtPayload {
  id: string;
  role: UserRole;
  permissions?: string[];
  labId?: string;
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
  packages?: mongoose.Types.ObjectId[];
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
  creatorType?: 'ADMIN' | 'LAB';
  labId?: mongoose.Types.ObjectId;
  approvalStatus?: ApprovalStatus;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISampleDetail {
  id?: string;
  productName: string;
  quantity: string;
  batchNumber: string;
  sku: string;
  specifics: string;
  selectedParameters: string[];
}

export interface IBookingItem {
  _id?: mongoose.Types.ObjectId;
  itemType: 'TEST' | 'PACKAGE';
  testId?: mongoose.Types.ObjectId;
  packageId?: mongoose.Types.ObjectId;
  samples: ISampleDetail[];
  price: number;
  mrp: number;
}

export interface IReportSummary {
  summary?: string;
  recommendations?: string;
  tips?: string;
  additionalNotes?: string;
  updatedAt?: Date;
  updatedByRole?: 'LAB' | 'ADMIN';
}

export interface IBooking extends Document {
  userId: mongoose.Types.ObjectId;
  labId: mongoose.Types.ObjectId;
  items: IBookingItem[];
  totalAmount?: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  bookingDate: Date;
  reportFiles?: string[];
  reportSummary?: IReportSummary;
  isReportApprovedByAdmin: boolean;
  collectionStatus?: CollectionStatus;
  collectionMethod?: 'PICKUP' | 'COURIER';
  courierDetails?: {
    trackingId: string;
    courierName?: string;
    notes?: string;
    submittedAt?: Date;
  };
  assignedCollector?: {
    name: string;
    contact: string;
  };
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
  image?: string;
  createdBy: mongoose.Types.ObjectId;
  approvalStatus?: ApprovalStatus;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICartItem {
  _id?: mongoose.Types.ObjectId;
  itemType: 'TEST' | 'PACKAGE';
  testId?: mongoose.Types.ObjectId;
  packageId?: mongoose.Types.ObjectId;
  parameters?: string[];
  price: number;
  mrp: number;
}

export interface ICart extends Document {
  userId?: mongoose.Types.ObjectId;
  sessionId?: string;
  items: ICartItem[];
  createdAt: Date;
  updatedAt: Date;
}
