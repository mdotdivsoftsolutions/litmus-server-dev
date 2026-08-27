import { Server, Socket } from 'socket.io';
import { ChatService } from '../services/chat.service';
import { presenceService } from '../services/presence.service';
import { BotKnowledgeService } from '../services/botKnowledge.service';
import { ChatSessionStatus, ChatUserType, MessageSenderType } from '../types';
import ChatSession from '../models/ChatSession';
import logger from '../utils/logger';

// In-memory rate limiting map: socketId -> { count: number, resetAt: number }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// 45-second agent disconnect grace timers: sessionId -> NodeJS.Timeout
const agentDisconnectTimers = new Map<string, NodeJS.Timeout>();

function checkRateLimit(socketId: string, maxEvents = 15, windowMs = 10000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(socketId);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(socketId, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (record.count >= maxEvents) {
    return false;
  }
  record.count++;
  return true;
}

export function registerChatHandlers(io: Server, socket: Socket) {
  const authData = socket.data.auth || {};
  const isAgent = Boolean(authData.isAgent);
  const agentId = authData.agentId;
  const agentName = authData.agentName || 'Litmus Specialist';
  const agentRole = authData.agentRole || 'EMPLOYEE';

  // If this is an admin/employee socket, join the broadcast dispatch channel
  if (isAgent && agentId) {
    socket.join('admin_support_channel');
    presenceService.registerAgent(agentId, agentName, agentRole, socket.id, 'ONLINE');
    logger.info(`[Socket] Agent ${agentName} (${agentId}) joined admin_support_channel [socket=${socket.id}]`);
  }

  // ── 0. EXPLICIT AGENT REGISTRATION ───────────────────────────────────────
  socket.on(
    'register_agent',
    (
      data: { agentId: string; name?: string; role?: string; status?: 'ONLINE' | 'BUSY' | 'OFFLINE' },
      callback?: any
    ) => {
      if (!data?.agentId) return;
      const finalName = data.name || agentName || 'Litmus Staff';
      const finalRole = data.role || agentRole || 'EMPLOYEE';
      const finalStatus = data.status || 'ONLINE';

      socket.data.auth = {
        ...socket.data.auth,
        isAgent: true,
        agentId: data.agentId,
        agentName: finalName,
        agentRole: finalRole,
      };

      socket.join('admin_support_channel');
      presenceService.registerAgent(data.agentId, finalName, finalRole, socket.id, finalStatus);
      logger.info(`[Socket] Explicit agent registered: ${finalName} (${data.agentId}) [socket=${socket.id}]`);

      io.to('admin_support_channel').emit('agents_updated', {
        onlineAgents: presenceService.getOnlineAgents(),
      });

      if (typeof callback === 'function') {
        callback({ success: true, onlineCount: presenceService.getOnlineAgents().length });
      }
    }
  );

  // ── 1. AGENT PRESENCE HEARTBEAT ──────────────────────────────────────────
  socket.on('agent_heartbeat', (data?: { agentId?: string; name?: string; role?: string; status?: 'ONLINE' | 'BUSY' | 'OFFLINE' }) => {
    const finalAgentId = data?.agentId || agentId;
    if (!finalAgentId) return;
    const finalName = data?.name || agentName || 'Litmus Staff';
    const finalRole = data?.role || agentRole || 'EMPLOYEE';
    const status = data?.status || 'ONLINE';

    socket.join('admin_support_channel');
    presenceService.registerAgent(finalAgentId, finalName, finalRole, socket.id, status);
    socket.emit('agent_presence_sync', { status, onlineCount: presenceService.getOnlineAgents().length });
  });

  socket.on('set_agent_status', (data: { status: 'ONLINE' | 'BUSY' | 'OFFLINE' }) => {
    if (!isAgent || !agentId) return;
    presenceService.setAgentStatus(agentId, data.status);
    io.to('admin_support_channel').emit('agents_updated', {
      onlineAgents: presenceService.getOnlineAgents(),
    });
  });

  // ── 2. CHECK ONLINE AGENTS (User query) ──────────────────────────────────
  socket.on('check_agents_online', (callback?: (res: { hasOnline: boolean; count: number }) => void) => {
    const hasOnline = presenceService.hasOnlineAgents();
    const count = presenceService.getOnlineAgents().filter((a) => a.status === 'ONLINE').length;
    if (typeof callback === 'function') {
      callback({ hasOnline, count });
    } else {
      socket.emit('agents_online_status', { hasOnline, count });
    }
  });

  // ── 2.1 JOIN CHAT SESSION ROOM ───────────────────────────────────────────
  socket.on('join_session', (data: { sessionId: string }, callback?: (res: any) => void) => {
    if (!data?.sessionId) return;
    socket.join(`chat_session_${data.sessionId}`);
    logger.info(`[Socket] ${isAgent ? `Agent ${agentName}` : 'User'} [${socket.id}] joined room: chat_session_${data.sessionId}`);
    if (typeof callback === 'function') callback({ success: true, sessionId: data.sessionId });
  });

  // ── 3. INITIALIZE / RESTORE CHAT SESSION ─────────────────────────────────
  socket.on(
    'init_session',
    async (
      data: {
        sessionId: string;
        userType?: 'REGISTERED' | 'GUEST';
        userId?: string;
        guestInfo?: { guestId: string; name?: string; phone?: string; email?: string };
        guestToken?: string;
      },
      callback?: (res: any) => void
    ) => {
      try {
        let finalSessionId = data.sessionId;
        let guestInfo = data.guestInfo;
        
        // Only treat as REGISTERED if explicit userType is REGISTERED and an actual customer userId exists
        const isExplicitRegistered = data.userType === 'REGISTERED' && Boolean(data.userId || (authData.isUser && authData.userId));
        const userId = isExplicitRegistered ? (data.userId || authData.userId) : undefined;
        const userType = isExplicitRegistered ? ChatUserType.REGISTERED : ChatUserType.GUEST;

        // Verify guest token if provided for session recovery
        if (data.guestToken) {
          const verifiedGuest = ChatService.verifyGuestToken(data.guestToken);
          if (verifiedGuest) {
            finalSessionId = verifiedGuest.sessionId;
            guestInfo = {
              guestId: verifiedGuest.guestId,
              name: verifiedGuest.name || guestInfo?.name,
              phone: verifiedGuest.phone || guestInfo?.phone,
              email: verifiedGuest.email || guestInfo?.email,
            };
          }
        }

        if (!finalSessionId) {
          finalSessionId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        }

        const session = await ChatService.getOrCreateSession({
          sessionId: finalSessionId,
          userType,
          userId,
          guestInfo: guestInfo
            ? {
                ...guestInfo,
                ipAddress: socket.handshake.address,
                userAgent: socket.handshake.headers['user-agent'],
              }
            : undefined,
        });

        // Join room for this session
        socket.join(`chat_session_${finalSessionId}`);

        // Generate guest token if guest user
        let newGuestToken: string | undefined;
        if (userType === ChatUserType.GUEST && guestInfo?.guestId) {
          newGuestToken = ChatService.generateGuestToken({
            guestId: guestInfo.guestId,
            sessionId: finalSessionId,
            name: guestInfo.name,
            phone: guestInfo.phone,
            email: guestInfo.email,
          });
        }

        // Fetch existing transcript
        const transcript = await ChatService.getTranscript(finalSessionId, isAgent);

        const responsePayload = {
          success: true,
          session,
          transcript,
          guestToken: newGuestToken,
          hasOnlineAgents: presenceService.hasOnlineAgents(),
        };

        if (typeof callback === 'function') {
          callback(responsePayload);
        } else {
          socket.emit('session_initialized', responsePayload);
        }
      } catch (err: any) {
        logger.error(`[Socket] init_session error: ${err.message}`);
        if (typeof callback === 'function') callback({ success: false, message: err.message });
      }
    }
  );

  // ── 4. BOT QUERY HANDLER (WebSocket Unified Bot) ─────────────────────────
  socket.on(
    'bot_query',
    async (
      data: { sessionId: string; text: string; clientMessageId?: string },
      callback?: (res: any) => void
    ) => {
      try {
        if (!checkRateLimit(socket.id)) {
          const errRes = { success: false, message: 'Too many messages. Please slow down.' };
          if (typeof callback === 'function') callback(errRes);
          return;
        }

        const { sessionId, text, clientMessageId } = data;
        if (!sessionId || !text?.trim()) return;

        // If session was previously resolved, missed, or closed, reset to BOT status and detach previous agent
        await ChatSession.updateOne(
          { sessionId, status: { $in: [ChatSessionStatus.RESOLVED, ChatSessionStatus.CLOSED, ChatSessionStatus.MISSED] } },
          { $set: { status: ChatSessionStatus.BOT, assignedAgent: null, unreadAgentCount: 0 } }
        );

        // 1. Record User Message in Chat transcript
        const { message: userMsg } = await ChatService.addMessage({
          sessionId,
          clientMessageId,
          senderType: MessageSenderType.USER,
          text: text.trim(),
        });

        // Broadcast user message to room
        io.to(`chat_session_${sessionId}`).emit('receive_message', userMsg);

        // 2. Query Bot Knowledge Engine
        const botResult = BotKnowledgeService.matchQuery(text);

        // 3. Record Bot Reply in Chat transcript
        const { message: botMsg } = await ChatService.addMessage({
          sessionId,
          senderType: MessageSenderType.BOT,
          senderName: 'Litmus Assistant',
          text: botResult.answer,
          actionSuggestions: botResult.actionSuggestions,
        });

        const botReplyPayload = {
          ...botMsg,
          intent: botResult.intent,
          actionSuggestions: botResult.actionSuggestions,
        };

        // Broadcast bot reply to room
        io.to(`chat_session_${sessionId}`).emit('receive_message', botReplyPayload);

        if (typeof callback === 'function') {
          callback({ success: true, userMessage: userMsg, botMessage: botReplyPayload });
        }
      } catch (err: any) {
        logger.error(`[Socket] bot_query error: ${err.message}`);
        if (typeof callback === 'function') callback({ success: false, message: err.message });
      }
    }
  );

  // ── 5. REQUEST LIVE SPECIALIST (Queueing & Dispatch) ────────────────────
  socket.on(
    'request_live_support',
    async (
      data: {
        sessionId: string;
        guestInfo?: { name?: string; phone?: string; email?: string };
        userId?: string;
        userType?: 'REGISTERED' | 'GUEST';
        initialQuery?: string;
      },
      callback?: (res: any) => void
    ) => {
      try {
        const { sessionId, guestInfo, initialQuery, userId, userType } = data;
        if (!sessionId) return;

        // Transition session to QUEUED status and bind active user if registered
        const isRegistered = userType === 'REGISTERED' && Boolean(userId);
        const session = await ChatService.queueSession({
          sessionId,
          guestInfo,
          userId: isRegistered ? userId : undefined,
          userType: isRegistered ? ChatUserType.REGISTERED : ChatUserType.GUEST,
        });
        if (!session) {
          const errRes = { success: false, message: 'Session not found' };
          if (typeof callback === 'function') callback(errRes);
          return;
        }

        // System notification message in room
        const { message: sysMsg } = await ChatService.addMessage({
          sessionId,
          senderType: MessageSenderType.SYSTEM,
          text: 'Connecting you with a certified Litmus specialist. Please hold on...',
        });
        io.to(`chat_session_${sessionId}`).emit('receive_message', sysMsg);

        // Fetch recent transcript for agent preview
        const recentTranscript = await ChatService.getTranscript(sessionId, false);
        const lastUserMsg = [...recentTranscript].reverse().find((m) => m.senderType === MessageSenderType.USER);
        const resolvedInitialQuery = initialQuery || lastUserMsg?.text || '';

        // Broadcast dispatch alert to all online Admin / Employee desks
        const isRegisteredSession = session.userType === ChatUserType.REGISTERED && Boolean(session.userId);
        const dispatchPayload = {
          sessionId,
          session,
          guestInfo: session.guestInfo,
          user: isRegisteredSession ? session.userId : null,
          userId: isRegisteredSession ? (typeof session.userId === 'object' ? (session.userId as any)._id : session.userId) : undefined,
          userType: isRegisteredSession ? ChatUserType.REGISTERED : ChatUserType.GUEST,
          queuedAt: session.queuedAt || new Date(),
          initialQuery: resolvedInitialQuery,
          transcriptPreview: recentTranscript.slice(-4),
        };

        // Sticky Routing Logic
        const previousAgentId = session.assignedAgent ? session.assignedAgent.toString() : null;
        
        if (previousAgentId && presenceService.isAgentOnline(previousAgentId)) {
          // Direct dispatch to previous agent
          io.to('admin_support_channel').emit('new_chat_request', {
            ...dispatchPayload,
            isDirectRoute: true,
            targetAgentId: previousAgentId
          });

          // Fallback to all agents if not claimed in 30s
          setTimeout(async () => {
            try {
              const checkSession = await ChatSession.findOne({ sessionId });
              if (checkSession && checkSession.status === ChatSessionStatus.QUEUED) {
                io.to('admin_support_channel').emit('new_chat_request', {
                  ...dispatchPayload,
                  isDirectRoute: false
                });
              }
            } catch (error) {
              logger.error(`Sticky routing fallback error: ${error}`);
            }
          }, 30000);
        } else {
          // Standard broadcast
          io.to('admin_support_channel').emit('new_chat_request', dispatchPayload);
        }

        const successRes = {
          success: true,
          status: ChatSessionStatus.QUEUED,
          message: 'Searching for an available specialist...',
          queuePosition: 1,
        };

        if (typeof callback === 'function') callback(successRes);
        socket.emit('chat_queued', successRes);
      } catch (err: any) {
        logger.error(`[Socket] request_live_support error: ${err.message}`);
        if (typeof callback === 'function') callback({ success: false, message: err.message });
      }
    }
  );

  // ── 6. ATOMIC CLAIM CHAT (Multi-Agent Acceptance) ────────────────────────
  socket.on(
    'accept_chat_request',
    async (data: { sessionId: string }, callback?: (res: any) => void) => {
      try {
        if (!isAgent || !agentId) {
          const unauthorized = { success: false, message: 'Only staff can accept chats' };
          if (typeof callback === 'function') callback(unauthorized);
          return;
        }

        const { sessionId } = data;
        if (!sessionId) return;

        // Atomic conditional assignment in MongoDB
        const result = await ChatService.atomicClaimSession({ sessionId, agentId });

        if (!result.success) {
          if (typeof callback === 'function') {
            callback({
              success: false,
              code: result.code,
              message:
                result.code === 'ALREADY_CLAIMED'
                  ? 'This chat has already been accepted by another specialist.'
                  : 'Unable to claim chat session.',
            });
          }
          return;
        }

        const session = result.session!;

        // Join the agent's socket to the chat room
        socket.join(`chat_session_${sessionId}`);

        // System message
        const { message: joinMsg } = await ChatService.addMessage({
          sessionId,
          senderType: MessageSenderType.SYSTEM,
          text: `Litmus Support Specialist has joined the conversation.`,
        });
        io.to(`chat_session_${sessionId}`).emit('receive_message', joinMsg);

        // Notify user widget that specialist is connected
        io.to(`chat_session_${sessionId}`).emit('chat_connected', {
          sessionId,
          agentName: 'Litmus Support Specialist',
          agentRole: 'Diagnostic Specialist',
          claimedAt: session.claimedAt,
        });

        // Broadcast to all other agents that this request is claimed (clears alert modal)
        io.to('admin_support_channel').emit('chat_request_claimed', {
          sessionId,
          claimedByAgentId: agentId,
          claimedByAgentName: agentName,
        });

        // Provide full transcript and customer context to the winning agent
        const transcript = await ChatService.getTranscript(sessionId, true);

        const agentSuccessRes = {
          success: true,
          session,
          transcript,
        };

        if (typeof callback === 'function') callback(agentSuccessRes);
        socket.emit('chat_started', agentSuccessRes);
      } catch (err: any) {
        logger.error(`[Socket] accept_chat_request error: ${err.message}`);
        if (typeof callback === 'function') callback({ success: false, message: err.message });
      }
    }
  );

  // ── 7. SEND LIVE MESSAGE (Client UUID & Server Ack) ──────────────────────
  socket.on(
    'send_message',
    async (
      data: {
        sessionId: string;
        clientMessageId?: string;
        text: string;
        attachments?: Array<{ url: string; name: string; type: string; size?: number }>;
        isInternalNote?: boolean;
      },
      callback?: (res: any) => void
    ) => {
      try {
        if (!checkRateLimit(socket.id)) {
          const errRes = { success: false, message: 'Rate limit exceeded. Please wait.' };
          if (typeof callback === 'function') callback(errRes);
          return;
        }

        const { sessionId, clientMessageId, text, attachments, isInternalNote } = data;
        if (!sessionId || (!text?.trim() && (!attachments || attachments.length === 0))) {
          if (typeof callback === 'function') callback({ success: false, message: 'Empty message' });
          return;
        }

        socket.join(`chat_session_${sessionId}`);

        const senderType = isAgent ? MessageSenderType.AGENT : MessageSenderType.USER;
        const senderName = isAgent ? agentName : undefined;
        const senderId = isAgent ? agentId : authData.userId;

        const { message, isDuplicate } = await ChatService.addMessage({
          sessionId,
          clientMessageId,
          senderType,
          senderId,
          senderName,
          text: text ? text.trim() : '',
          attachments,
          isInternalNote,
        });

        // If internal note, only broadcast to staff
        if (isInternalNote) {
          io.to(`chat_session_${sessionId}`).emit('receive_internal_note', message);
        } else {
          // Broadcast to all participants in room
          io.to(`chat_session_${sessionId}`).emit('receive_message', message);
        }

        // Acknowledge back to sender
        if (typeof callback === 'function') {
          callback({
            success: true,
            messageId: message._id,
            clientMessageId: message.clientMessageId,
            createdAt: message.createdAt,
            isDuplicate,
          });
        }
      } catch (err: any) {
        logger.error(`[Socket] send_message error: ${err.message}`);
        if (typeof callback === 'function') callback({ success: false, message: err.message });
      }
    }
  );

  // ── 8. TYPING INDICATORS (Transient Broadcast) ───────────────────────────
  socket.on('typing_indicator', (data: { sessionId: string; isTyping: boolean }) => {
    if (!data.sessionId) return;
    socket.join(`chat_session_${data.sessionId}`);
    socket.to(`chat_session_${data.sessionId}`).emit('user_typing', {
      sessionId: data.sessionId,
      senderType: isAgent ? MessageSenderType.AGENT : MessageSenderType.USER,
      isTyping: data.isTyping,
    });
  });

  // ── 9. MARK READ ─────────────────────────────────────────────────────────
  socket.on('mark_read', async (data: { sessionId: string }) => {
    if (!data.sessionId) return;
    socket.join(`chat_session_${data.sessionId}`);
    await ChatService.markMessagesRead(data.sessionId, isAgent ? 'AGENT' : 'USER');
    socket.to(`chat_session_${data.sessionId}`).emit('messages_marked_read', {
      sessionId: data.sessionId,
      by: isAgent ? 'AGENT' : 'USER',
    });
  });

  // ── 9b. CANCEL LIVE SUPPORT / RETURN TO BOT ──────────────────────────────
  socket.on(
    'cancel_live_support',
    async (
      data: { sessionId: string },
      callback?: (res: any) => void
    ) => {
      try {
        const { sessionId } = data;
        if (!sessionId) return;

        // Reset session to BOT status
        const session = await ChatSession.findOneAndUpdate(
          { sessionId },
          { $set: { status: ChatSessionStatus.BOT, assignedAgent: null, queuedAt: null, unreadAgentCount: 0 } },
          { new: true }
        );

        // System notification in room
        const { message: cancelSysMsg } = await ChatService.addMessage({
          sessionId,
          senderType: MessageSenderType.SYSTEM,
          text: 'Live support request was cancelled. Switched back to AI Assistant.',
        });
        io.to(`chat_session_${sessionId}`).emit('receive_message', cancelSysMsg);

        // Broadcast to admin channel to cancel/dismiss pending incoming notifications
        io.to('admin_support_channel').emit('chat_request_cancelled', { sessionId });
        io.to('admin_support_channel').emit('chat_session_updated', {
          sessionId,
          status: ChatSessionStatus.BOT,
        });

        io.to(`chat_session_${sessionId}`).emit('chat_cancelled', { sessionId, status: ChatSessionStatus.BOT });

        if (typeof callback === 'function') callback({ success: true, session });
      } catch (err: any) {
        logger.error(`[Socket] cancel_live_support error: ${err.message}`);
        if (typeof callback === 'function') callback({ success: false, message: err.message });
      }
    }
  );

  // ── 10. RESOLVE / CLOSE CHAT ─────────────────────────────────────────────
  socket.on(
    'close_chat',
    async (
      data: { sessionId: string; resolutionNotes?: string },
      callback?: (res: any) => void
    ) => {
      try {
        const { sessionId, resolutionNotes } = data;
        if (!sessionId) return;

        const session = await ChatService.closeSession({
          sessionId,
          closedByAgentId: agentId,
          resolutionNotes,
        });

        const endSysMsg = await ChatService.addMessage({
          sessionId,
          senderType: MessageSenderType.SYSTEM,
          text: 'This chat session has ended. Thank you for contacting Litmus.',
        });

        io.to(`chat_session_${sessionId}`).emit('receive_message', endSysMsg.message);
        io.to(`chat_session_${sessionId}`).emit('chat_ended', {
          sessionId,
          status: ChatSessionStatus.RESOLVED,
          showRatingPrompt: true,
        });

        io.to('admin_support_channel').emit('chat_request_cancelled', { sessionId });
        io.to('admin_support_channel').emit('chat_session_updated', {
          sessionId,
          status: ChatSessionStatus.RESOLVED,
        });

        if (typeof callback === 'function') callback({ success: true, session });
      } catch (err: any) {
        logger.error(`[Socket] close_chat error: ${err.message}`);
        if (typeof callback === 'function') callback({ success: false, message: err.message });
      }
    }
  );

  // ── 11. RE-QUEUE CHAT (Edge Case: Agent Disconnect or Transfer) ───────────
  socket.on('requeue_chat', async (data: { sessionId: string }, callback?: (res: any) => void) => {
    try {
      const { sessionId } = data;
      if (!sessionId) return;

      const session = await ChatService.reQueueSession(sessionId);
      io.to(`chat_session_${sessionId}`).emit('chat_queued', {
        sessionId,
        status: ChatSessionStatus.QUEUED,
        message: 'Re-connecting you to the next available specialist...',
      });

      io.to('admin_support_channel').emit('new_chat_request', {
        sessionId,
        session,
        isRequeued: true,
      });

      if (typeof callback === 'function') callback({ success: true, session });
    } catch (err: any) {
      if (typeof callback === 'function') callback({ success: false, message: err.message });
    }
  });

  // ── 12. RATE CHAT SESSION ────────────────────────────────────────────────
  socket.on(
    'rate_session',
    async (data: { sessionId: string; score: number; feedback?: string }, callback?: (res: any) => void) => {
      try {
        const { sessionId, score, feedback } = data;
        if (!sessionId || !score) return;
        const session = await ChatService.rateSession({ sessionId, score, feedback });
        if (typeof callback === 'function') callback({ success: true, session });
      } catch (err: any) {
        if (typeof callback === 'function') callback({ success: false, message: err.message });
      }
    }
  );

  // ── 12.1 TRANSFER / FORWARD CHAT SESSION ─────────────────────────────────
  socket.on(
    'transfer_chat',
    async (
      data: { sessionId: string; targetAgentId: string; targetAgentName?: string; note?: string },
      callback?: (res: any) => void
    ) => {
      try {
        const { sessionId, targetAgentId, targetAgentName, note } = data;
        if (!sessionId || !targetAgentId) {
          if (typeof callback === 'function') callback({ success: false, message: 'Session and target employee are required' });
          return;
        }

        const session = await ChatService.transferSession({
          sessionId,
          targetAgentId,
          transferredByAgentId: agentId,
          transferredByAgentName: agentName,
        });

        if (!session) {
          if (typeof callback === 'function') callback({ success: false, message: 'Session not found' });
          return;
        }

        // Add internal transfer note if provided
        if (note && note.trim() && agentId) {
          await ChatService.addInternalNote({
            sessionId,
            authorId: agentId,
            authorName: agentName,
            note: `Transferred to ${targetAgentName || 'Specialist'}: ${note.trim()}`,
          });
        }

        // Add system message to the chat
        const { message: transferMsg } = await ChatService.addMessage({
          sessionId,
          senderType: MessageSenderType.SYSTEM,
          text: `Conversation forwarded to specialist ${targetAgentName || 'team member'}.`,
        });

        io.to(`chat_session_${sessionId}`).emit('receive_message', transferMsg);
        io.to(`chat_session_${sessionId}`).emit('chat_connected', {
          sessionId,
          agentName: targetAgentName || 'Litmus Specialist',
          agentRole: 'Diagnostic Specialist',
        });

        // Broadcast update to all staff channels
        io.to('admin_support_channel').emit('chat_session_updated', {
          sessionId,
          status: ChatSessionStatus.ACTIVE,
          assignedAgent: session.assignedAgent,
        });

        if (typeof callback === 'function') callback({ success: true, session });
      } catch (err: any) {
        logger.error(`[Socket] transfer_chat error: ${err.message}`);
        if (typeof callback === 'function') callback({ success: false, message: err.message });
      }
    }
  );

  // ── 13. DISCONNECT & 45-SECOND GRACE PERIOD ──────────────────────────────
  socket.on('disconnect', () => {
    rateLimitMap.delete(socket.id);

    if (isAgent && agentId) {
      const { wasLastSocket } = presenceService.removeSocket(socket.id);

      if (wasLastSocket) {
        logger.info(`[Socket] Agent ${agentName} (${agentId}) last socket disconnected. Starting 45s grace check.`);

        // Notify other agents of presence change
        io.to('admin_support_channel').emit('agents_updated', {
          onlineAgents: presenceService.getOnlineAgents(),
        });
      }
    }
  });
}
