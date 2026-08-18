import mongoose, { Schema } from 'mongoose';
import { IChatSession, ChatSessionStatus, ChatUserType } from '../types';

const ChatSessionSchema: Schema = new Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userType: {
      type: String,
      enum: Object.values(ChatUserType),
      default: ChatUserType.GUEST,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    guestInfo: {
      guestId: { type: String, index: true },
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      ipAddress: { type: String },
      userAgent: { type: String },
    },
    status: {
      type: String,
      enum: Object.values(ChatSessionStatus),
      default: ChatSessionStatus.BOT,
      required: true,
      index: true,
    },
    assignedAgent: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    claimedAt: {
      type: Date,
    },
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    queuedAt: {
      type: Date,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    unreadAgentCount: {
      type: Number,
      default: 0,
    },
    unreadUserCount: {
      type: Number,
      default: 0,
    },
    internalNotes: [
      {
        authorId: { type: Schema.Types.ObjectId, ref: 'User' },
        authorName: { type: String },
        note: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    rating: {
      score: { type: Number, min: 1, max: 5 },
      feedback: { type: String },
      submittedAt: { type: Date },
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for high performance querying
ChatSessionSchema.index({ status: 1, createdAt: 1 });
ChatSessionSchema.index({ status: 1, assignedAgent: 1 });
ChatSessionSchema.index({ userId: 1, createdAt: -1 });
ChatSessionSchema.index({ 'guestInfo.guestId': 1, createdAt: -1 });

export default mongoose.model<IChatSession>('ChatSession', ChatSessionSchema);
