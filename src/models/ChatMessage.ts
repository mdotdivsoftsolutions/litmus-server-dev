import mongoose, { Schema } from 'mongoose';
import { IChatMessage, MessageSenderType } from '../types';

const ChatMessageSchema: Schema = new Schema(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    sessionObjectId: {
      type: Schema.Types.ObjectId,
      ref: 'ChatSession',
      index: true,
    },
    clientMessageId: {
      type: String,
      sparse: true,
    },
    senderType: {
      type: String,
      enum: Object.values(MessageSenderType),
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    senderName: {
      type: String,
      trim: true,
    },
    text: {
      type: String,
      required: true,
    },
    attachments: [
      {
        url: { type: String, required: true },
        name: { type: String, required: true },
        type: { type: String, required: true },
        size: { type: Number },
      },
    ],
    isInternalNote: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// High-speed transcript loading index
ChatMessageSchema.index({ sessionId: 1, createdAt: 1 });

// Critical Guardrail: Partial unique index on clientMessageId to prevent duplicate message deliveries
// while allowing null/undefined clientMessageId on bot/system messages.
ChatMessageSchema.index(
  { clientMessageId: 1 },
  { unique: true, partialFilterExpression: { clientMessageId: { $exists: true, $type: 'string' } } }
);

export default mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
