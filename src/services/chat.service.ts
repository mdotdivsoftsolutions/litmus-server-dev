import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import ChatSession from '../models/ChatSession';
import ChatMessage from '../models/ChatMessage';
import {
  IChatSession,
  IChatMessage,
  ChatSessionStatus,
  ChatUserType,
  MessageSenderType,
  IChatAttachment,
} from '../types';
import { encryptText, decryptText } from '../utils/encryption';
import logger from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'litmus_chat_jwt_secret_key_2026';

export interface GuestTokenPayload {
  guestId: string;
  sessionId: string;
  name?: string;
  phone?: string;
  email?: string;
  createdAt: number;
}

export class ChatService {
  /**
   * Generate a signed lightweight guest session token
   */
  public static generateGuestToken(payload: {
    guestId: string;
    sessionId: string;
    name?: string;
    phone?: string;
    email?: string;
  }): string {
    return jwt.sign(
      {
        ...payload,
        createdAt: Date.now(),
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  /**
   * Verify and decode a guest session token
   */
  public static verifyGuestToken(token: string): GuestTokenPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as GuestTokenPayload;
      return decoded;
    } catch {
      return null;
    }
  }

  /**
   * Get or create an active chat session for a user or guest
   */
  public static async getOrCreateSession(params: {
    sessionId: string;
    userType: ChatUserType;
    userId?: string;
    guestInfo?: {
      guestId: string;
      name?: string;
      phone?: string;
      email?: string;
      ipAddress?: string;
      userAgent?: string;
    };
  }): Promise<IChatSession> {
    let session = await ChatSession.findOne({ sessionId: params.sessionId })
      .populate('userId', 'firstName lastName email phone companyName profilePic')
      .populate('assignedAgent', 'firstName lastName profilePic designation department role email phone');

    if (!session) {
      session = new ChatSession({
        sessionId: params.sessionId,
        userType: params.userType,
        userId: (params.userType === ChatUserType.REGISTERED && params.userId) ? new mongoose.Types.ObjectId(params.userId) : undefined,
        guestInfo: params.guestInfo,
        status: ChatSessionStatus.BOT,
        startedAt: new Date(),
        lastMessageAt: new Date(),
      });
      await session.save();
      session = await ChatSession.findById(session._id)
        .populate('userId', 'firstName lastName email phone companyName profilePic')
        .populate('assignedAgent', 'firstName lastName profilePic designation department role email phone') as any;
    } else {
      let isUpdated = false;
      if (params.guestInfo) {
        session.guestInfo = { ...session.guestInfo, ...params.guestInfo };
        isUpdated = true;
      }

      if (params.userType === ChatUserType.REGISTERED && params.userId) {
        session.userType = ChatUserType.REGISTERED;
        session.userId = new mongoose.Types.ObjectId(params.userId);
        isUpdated = true;
      }

      if (isUpdated) {
        await session.save();
        session = await ChatSession.findById(session._id)
          .populate('userId', 'firstName lastName email phone companyName profilePic')
          .populate('assignedAgent', 'firstName lastName profilePic designation department role email phone') as any;
      }
    }

    return session as IChatSession;
  }

  /**
   * Transition session to QUEUED status for live agent support
   */
  public static async queueSession(params: {
    sessionId: string;
    guestInfo?: {
      name?: string;
      phone?: string;
      email?: string;
    };
    userId?: string;
    userType?: ChatUserType;
  }): Promise<IChatSession | null> {
    const updateQuery: any = {
      status: ChatSessionStatus.QUEUED,
      queuedAt: new Date(),
      lastMessageAt: new Date(),
    };

    if (params.userId && params.userType === ChatUserType.REGISTERED) {
      updateQuery.userId = new mongoose.Types.ObjectId(params.userId);
      updateQuery.userType = ChatUserType.REGISTERED;
    }

    if (params.guestInfo) {
      if (params.guestInfo.name) updateQuery['guestInfo.name'] = params.guestInfo.name;
      if (params.guestInfo.phone) updateQuery['guestInfo.phone'] = params.guestInfo.phone;
      if (params.guestInfo.email) updateQuery['guestInfo.email'] = params.guestInfo.email;
    }

    const session = await ChatSession.findOneAndUpdate(
      { sessionId: params.sessionId },
      { $set: updateQuery },
      { new: true }
    )
      .populate('userId', 'firstName lastName email phone companyName profilePic')
      .populate('assignedAgent', 'firstName lastName profilePic designation department role email phone');

    return session;
  }

  /**
   * Atomic multi-agent claim (Race Condition Prevention)
   * Ensures only the first agent to accept successfully gets assigned
   */
  public static async atomicClaimSession(params: {
    sessionId: string;
    agentId: string;
  }): Promise<{ success: boolean; session?: IChatSession; code?: string }> {
    try {
      const session = await ChatSession.findOneAndUpdate(
        { sessionId: params.sessionId, status: ChatSessionStatus.QUEUED },
        {
          $set: {
            status: ChatSessionStatus.ACTIVE,
            assignedAgent: new mongoose.Types.ObjectId(params.agentId),
            claimedAt: new Date(),
            lastMessageAt: new Date(),
          },
        },
        { new: true }
      )
        .populate('assignedAgent', 'firstName lastName profilePic designation department role email phone')
        .populate('userId', 'firstName lastName email phone companyName');

      if (!session) {
        // Check if session was already claimed or does not exist
        const existing = await ChatSession.findOne({ sessionId: params.sessionId });
        if (existing && existing.status === ChatSessionStatus.ACTIVE) {
          return { success: false, code: 'ALREADY_CLAIMED' };
        }
        return { success: false, code: 'NOT_FOUND' };
      }

      return { success: true, session };
    } catch (err: any) {
      logger.error(`Error in atomicClaimSession: ${err.message}`);
      return { success: false, code: 'SERVER_ERROR' };
    }
  }

  /**
   * Add a message with clientMessageId deduplication guardrail
   */
  public static async addMessage(params: {
    sessionId: string;
    clientMessageId?: string;
    senderType: MessageSenderType;
    senderId?: string;
    senderName?: string;
    text: string;
    attachments?: IChatAttachment[];
    actionSuggestions?: Array<{ label: string; action: string; payload?: any }>;
    isInternalNote?: boolean;
  }): Promise<{ message: IChatMessage; isDuplicate: boolean }> {
    // Deduplication check if clientMessageId is provided
    if (params.clientMessageId) {
      const existing = await ChatMessage.findOne({ clientMessageId: params.clientMessageId });
      if (existing) {
        return { message: existing, isDuplicate: true };
      }
    }

    const session = await ChatSession.findOne({ sessionId: params.sessionId });
    const sessionObjectId = session ? session._id : undefined;

    // Encrypt message text before storing at rest in database
    const encryptedText = encryptText(params.text);

    const message = new ChatMessage({
      sessionId: params.sessionId,
      sessionObjectId,
      clientMessageId: params.clientMessageId,
      senderType: params.senderType,
      senderId: params.senderId ? new mongoose.Types.ObjectId(params.senderId) : undefined,
      senderName: params.senderName,
      text: encryptedText,
      attachments: params.attachments,
      actionSuggestions: params.actionSuggestions,
      isInternalNote: params.isInternalNote || false,
    });

    await message.save();

    // Update session timestamp and unread counters
    if (session) {
      session.lastMessageAt = new Date();
      if (params.senderType === MessageSenderType.USER) {
        if (session.status === ChatSessionStatus.ACTIVE || session.status === ChatSessionStatus.QUEUED) {
          session.unreadAgentCount = (session.unreadAgentCount || 0) + 1;
        }
      } else if (params.senderType === MessageSenderType.AGENT) {
        session.unreadUserCount = (session.unreadUserCount || 0) + 1;
      }
      await session.save();
    }

    const returnedMessage: any = message.toObject();
    returnedMessage.text = params.text;
    returnedMessage.actionSuggestions = params.actionSuggestions;

    return { message: returnedMessage, isDuplicate: false };
  }

  /**
   * Mark messages in a session as read
   */
  public static async markMessagesRead(sessionId: string, readerType: 'USER' | 'AGENT'): Promise<void> {
    const filter: any = { sessionId, readAt: { $exists: false } };
    if (readerType === 'AGENT') {
      filter.senderType = MessageSenderType.USER;
      await ChatSession.updateOne({ sessionId }, { $set: { unreadAgentCount: 0 } });
    } else {
      filter.senderType = { $in: [MessageSenderType.AGENT, MessageSenderType.BOT] };
      await ChatSession.updateOne({ sessionId }, { $set: { unreadUserCount: 0 } });
    }

    await ChatMessage.updateMany(filter, { $set: { readAt: new Date() } });
  }

  /**
   * Fetch full conversation transcript for a session (used for handoff and history)
   * Transparently decrypts messages at read-time
   */
  public static async getTranscript(sessionId: string, includeInternalNotes = false): Promise<IChatMessage[]> {
    const filter: any = { sessionId };
    if (!includeInternalNotes) {
      filter.isInternalNote = { $ne: true };
    }
    const rawMessages = await ChatMessage.find(filter).sort({ createdAt: 1 }).lean();
    return rawMessages.map((msg: any) => ({
      ...msg,
      text: decryptText(msg.text),
    }));
  }

  /**
   * Close or resolve a chat session
   */
  public static async closeSession(params: {
    sessionId: string;
    closedByAgentId?: string;
    resolutionNotes?: string;
  }): Promise<IChatSession | null> {
    const update: any = {
      status: ChatSessionStatus.RESOLVED,
      endedAt: new Date(),
    };

    if (params.resolutionNotes && params.closedByAgentId) {
      update.$push = {
        internalNotes: {
          authorId: new mongoose.Types.ObjectId(params.closedByAgentId),
          note: encryptText(`Resolution summary: ${params.resolutionNotes}`),
          createdAt: new Date(),
        },
      };
    }

    const session = await ChatSession.findOneAndUpdate(
      { sessionId: params.sessionId },
      { $set: update },
      { new: true }
    );

    return session;
  }

  /**
   * Transfer an active session to another agent or reassign
   */
  public static async transferSession(params: {
    sessionId: string;
    targetAgentId: string;
    transferredByAgentId?: string;
    transferredByAgentName?: string;
  }): Promise<IChatSession | null> {
    const session = await ChatSession.findOneAndUpdate(
      { sessionId: params.sessionId },
      {
        $set: {
          assignedAgent: new mongoose.Types.ObjectId(params.targetAgentId),
          status: ChatSessionStatus.ACTIVE,
          claimedAt: new Date(),
        },
      },
      { new: true }
    )
      .populate('assignedAgent', 'firstName lastName profilePic designation department role email phone')
      .populate('userId', 'firstName lastName email phone companyName');

    return session;
  }

  /**
   * Re-queue a session if agent disconnected or transfer requested
   */
  public static async reQueueSession(sessionId: string): Promise<IChatSession | null> {
    const session = await ChatSession.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          status: ChatSessionStatus.QUEUED,
          assignedAgent: null,
          queuedAt: new Date(),
        },
      },
      { new: true }
    );
    return session;
  }

  /**
   * Add internal staff note to a session
   */
  public static async addInternalNote(params: {
    sessionId: string;
    authorId: string;
    authorName: string;
    note: string;
  }): Promise<IChatSession | null> {
    const session = await ChatSession.findOneAndUpdate(
      { sessionId: params.sessionId },
      {
        $push: {
          internalNotes: {
            authorId: new mongoose.Types.ObjectId(params.authorId),
            authorName: params.authorName,
            note: encryptText(params.note),
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    );
    return session;
  }

  /**
   * Helper to decrypt sensitive fields on a session object before sending to authorized callers
   */
  public static decryptSession(session: any): any {
    if (!session) return session;
    const s = typeof session.toObject === 'function' ? session.toObject() : { ...session };
    if (Array.isArray(s.internalNotes)) {
      s.internalNotes = s.internalNotes.map((n: any) => ({
        ...n,
        note: decryptText(n.note),
      }));
    }
    return s;
  }

  /**
   * Record customer satisfaction rating
   */
  public static async rateSession(params: {
    sessionId: string;
    score: number;
    feedback?: string;
  }): Promise<IChatSession | null> {
    const session = await ChatSession.findOneAndUpdate(
      { sessionId: params.sessionId },
      {
        $set: {
          rating: {
            score: params.score,
            feedback: params.feedback,
            submittedAt: new Date(),
          },
        },
      },
      { new: true }
    );
    return session;
  }

  /**
   * Check and transition overdue queued sessions to MISSED (Queue SLA Timeout)
   */
  public static async checkAndExpireQueuedSessions(timeoutMinutes = 3): Promise<IChatSession[]> {
    const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);
    const expiredSessions = await ChatSession.find({
      status: ChatSessionStatus.QUEUED,
      queuedAt: { $lt: cutoff },
    });

    if (expiredSessions.length > 0) {
      await ChatSession.updateMany(
        {
          status: ChatSessionStatus.QUEUED,
          queuedAt: { $lt: cutoff },
        },
        {
          $set: {
            status: ChatSessionStatus.MISSED,
            endedAt: new Date(),
          },
        }
      );
    }

    return expiredSessions;
  }
}
