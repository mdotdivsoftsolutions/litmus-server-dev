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
  MANAGE_SUPPORT_CHAT = 'MANAGE_SUPPORT_CHAT',
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
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  fssaiNumber?: string;
  gstNumber?: string;
  companyName?: string;
  industryCategory?: string;
  customerSegment?: 'INDIVIDUAL' | 'FOOD_BUSINESS' | 'ENTERPRISE' | 'LAB_PARTNER';
  alternatePhone?: string;
  kycStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  kycVerifiedAt?: Date;
  adminNotes?: Array<{
    _id?: string;
    note: string;
    authorId?: string;
    authorName?: string;
    createdAt?: Date;
  }>;
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

export interface ISubcategory {
  _id?: mongoose.Types.ObjectId | string;
  name: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
}

export interface ICategory extends Document {
  name: string;
  description?: string;
  imageUrl?: string;
  subcategories?: ISubcategory[];
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
  imageUrl?: string;
  icon?: string;
  price: number;
  offerPrice?: number;
  turnAroundTime?: string;
  isPopular?: boolean;
  metadata?: any;
  applicableCategories?: mongoose.Types.ObjectId[];
  applicableSubcategories?: string[];
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
  reportUrl?: string;
  reportSummary?: IReportSummary;
  isReportApprovedByAdmin: boolean;
  collectionStatus?: CollectionStatus;
  collectionMethod?: 'PICKUP' | 'COURIER';
  collectionDetails?: any;
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
  invoiceNumber?: string;
  invoiceDate?: Date;
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

export enum ChatSessionStatus {
  BOT = 'BOT',
  QUEUED = 'QUEUED',
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
  MISSED = 'MISSED',
  CLOSED = 'CLOSED',
}

export enum ChatUserType {
  REGISTERED = 'REGISTERED',
  GUEST = 'GUEST',
}

export enum MessageSenderType {
  USER = 'USER',
  AGENT = 'AGENT',
  BOT = 'BOT',
  SYSTEM = 'SYSTEM',
}

export interface IChatSession extends Document {
  sessionId: string;
  userType: ChatUserType;
  userId?: mongoose.Types.ObjectId;
  guestInfo?: {
    guestId: string;
    name?: string;
    phone?: string;
    email?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  status: ChatSessionStatus;
  assignedAgent?: mongoose.Types.ObjectId;
  claimedAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  queuedAt?: Date;
  lastMessageAt?: Date;
  unreadAgentCount: number;
  unreadUserCount: number;
  internalNotes?: {
    _id?: mongoose.Types.ObjectId;
    authorId: mongoose.Types.ObjectId;
    authorName: string;
    note: string;
    createdAt: Date;
  }[];
  rating?: {
    score: number;
    feedback?: string;
    submittedAt: Date;
  };
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface IChatAttachment {
  url: string;
  name: string;
  type: string;
  size?: number;
}

export interface IChatActionSuggestion {
  label: string;
  action: string;
  payload?: any;
}

export interface IChatMessage extends Document {
  sessionId: string;
  sessionObjectId?: mongoose.Types.ObjectId;
  clientMessageId?: string;
  senderType: MessageSenderType;
  senderId?: mongoose.Types.ObjectId;
  senderName?: string;
  text: string;
  attachments?: IChatAttachment[];
  actionSuggestions?: IChatActionSuggestion[];
  isInternalNote?: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}


