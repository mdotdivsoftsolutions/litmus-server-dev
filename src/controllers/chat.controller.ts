import { Request, Response } from 'express';
import ChatSession from '../models/ChatSession';
import { ChatService } from '../services/chat.service';
import { BotKnowledgeService } from '../services/botKnowledge.service';
import { presenceService } from '../services/presence.service';
import logger from '../utils/logger';

export const CANNED_RESPONSES = [
  {
    id: 'greeting',
    category: 'Greetings',
    title: 'Warm Welcome',
    text: 'Hello! Thank you for reaching out to Litmus Diagnostic Support. How may I assist you with your testing requirements today?',
  },
  {
    id: 'sample_packaging',
    category: 'Instructions',
    title: 'Sample Packaging & Dispatch',
    text: 'Please pack the sample in an airtight, sealed container and attach the printed Sample Submission Slip. Dispatch to our accredited laboratory hub.',
  },
  {
    id: 'tat_info',
    category: 'Turnaround Time',
    title: 'Standard Turnaround Time',
    text: 'Our standard analysis takes 3 to 5 working days from sample receipt. You will receive an instant notification with the verified PDF report.',
  },
  {
    id: 'fssai_nabl',
    category: 'Certifications',
    title: 'NABL & FSSAI Compliance',
    text: 'All tests are conducted in strict compliance with NABL (ISO/IEC 17025) and FSSAI standards with verifiable QR code security.',
  },
  {
    id: 'closing',
    category: 'Closing',
    title: 'Friendly Closing',
    text: 'Is there anything else I can help you with today? Thank you for choosing Litmus!',
  },
];

export class ChatController {
  /**
   * Get list of chat sessions (Admin/Employee view)
   */
  public static async getSessions(req: Request, res: Response): Promise<void> {
    try {
      const { status, agentId, userType, search, page = '1', limit = '30' } = req.query;

      const query: any = {};
      if (status && status !== 'ALL') {
        query.status = status;
      }
      if (agentId) {
        query.assignedAgent = agentId;
      }
      if (userType) {
        query.userType = userType;
      }
      if (search) {
        query.$or = [
          { 'guestInfo.name': { $regex: search, $options: 'i' } },
          { 'guestInfo.phone': { $regex: search, $options: 'i' } },
          { 'guestInfo.email': { $regex: search, $options: 'i' } },
          { sessionId: { $regex: search, $options: 'i' } },
        ];
      }

      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 30;
      const skip = (pageNum - 1) * limitNum;

      const [sessions, total] = await Promise.all([
        ChatSession.find(query)
          .populate('assignedAgent', 'firstName lastName profilePic designation department role email phone')
          .populate('userId', 'firstName lastName email phone companyName')
          .sort({ lastMessageAt: -1, createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        ChatSession.countDocuments(query),
      ]);

      res.status(200).json({
        success: true,
        data: sessions,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (err: any) {
      logger.error(`[ChatController.getSessions] Error: ${err.message}`);
      res.status(500).json({ success: false, message: 'Failed to fetch chat sessions' });
    }
  }

  /**
   * Get single chat session with details
   */
  public static async getSessionById(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = String(req.params.sessionId);
      const session = await ChatSession.findOne({ sessionId })
        .populate('assignedAgent', 'firstName lastName profilePic designation department role email phone')
        .populate('userId', 'firstName lastName email phone companyName')
        .lean();

      if (!session) {
        res.status(404).json({ success: false, message: 'Session not found' });
        return;
      }

      res.status(200).json({ success: true, data: session });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get messages transcript for a session
   */
  public static async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = String(req.params.sessionId);
      const includeInternalNotes = Boolean(req.query.includeInternalNotes === 'true');
      const messages = await ChatService.getTranscript(sessionId, includeInternalNotes);
      res.status(200).json({ success: true, data: messages });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Add internal staff note
   */
  public static async addNote(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = String(req.params.sessionId);
      const { note } = req.body;
      const user = (req as any).user;

      if (!note?.trim()) {
        res.status(400).json({ success: false, message: 'Note text is required' });
        return;
      }

      const authorName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Staff' : 'Staff';
      const authorId = user?._id || user?.id;

      const updated = await ChatService.addInternalNote({
        sessionId,
        authorId: authorId.toString(),
        authorName,
        note: note.trim(),
      });

      res.status(200).json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get online agents & presence metrics
   */
  public static async getPresence(req: Request, res: Response): Promise<void> {
    try {
      const onlineAgents = presenceService.getOnlineAgents();
      const hasOnline = presenceService.hasOnlineAgents();
      res.status(200).json({
        success: true,
        data: {
          hasOnline,
          count: onlineAgents.length,
          agents: onlineAgents,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Query Bot Knowledge via REST (Fallback)
   */
  public static async queryBot(req: Request, res: Response): Promise<void> {
    try {
      const { query } = req.body;
      const result = BotKnowledgeService.matchQuery(query || '');
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get canned responses for agents
   */
  public static async getCannedResponses(req: Request, res: Response): Promise<void> {
    res.status(200).json({ success: true, data: CANNED_RESPONSES });
  }
}
