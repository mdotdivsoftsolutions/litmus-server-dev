import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { registerChatHandlers } from './chat.handler';
import { ChatService } from '../services/chat.service';
import { UserRole } from '../types';
import logger from '../utils/logger';
import { ALLOWED_ORIGINS } from '../config/cors';
import { SOCKET_EVENTS } from '../constants';

let ioInstance: Server | null = null;

export function getIO(): Server {
  if (!ioInstance) {
    throw new Error('Socket.IO is not initialized!');
  }
  return ioInstance;
}

export function initSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: ALLOWED_ORIGINS,
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
    transports: ['websocket', 'polling'],
  });

  ioInstance = io;

  // ── Redis Adapter for Horizontal Scaling (Optional / Configurable) ─────────
  const redisUrl = process.env.REDIS_URL || (process.env.REDIS_HOST ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}` : null);
  if (redisUrl) {
    try {
      const pubClient = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => (times > 3 ? null : Math.min(times * 100, 2000)),
      });
      const subClient = pubClient.duplicate();

      Promise.all([pubClient.connect(), subClient.connect()])
        .then(() => {
          io.adapter(createAdapter(pubClient, subClient));
          logger.info('🚀 [Socket.IO] Redis adapter initialized successfully for horizontal clustering');
        })
        .catch((err) => {
          logger.warn(`⚠️ [Socket.IO] Redis adapter connection skipped (${err.message}). Using in-memory adapter.`);
        });
    } catch (err: any) {
      logger.warn(`⚠️ [Socket.IO] Failed to configure Redis adapter: ${err.message}`);
    }
  }

  // ── Authentication Middleware ─────────────────────────────────────────────
  io.use((socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
        parseCookie(socket.handshake.headers.cookie || '', 'accessToken') ||
        parseCookie(socket.handshake.headers.cookie || '', 'refreshToken') ||
        parseCookie(socket.handshake.headers.cookie || '', 'token');

      const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
      const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

      if (token) {
        let decoded: any = null;
        if (JWT_ACCESS_SECRET) {
          try {
            decoded = jwt.verify(token, JWT_ACCESS_SECRET);
          } catch {
            if (JWT_REFRESH_SECRET) {
              try {
                decoded = jwt.verify(token, JWT_REFRESH_SECRET);
              } catch {
                try {
                  decoded = jwt.decode(token);
                } catch {}
              }
            }
          }
        }

        if (decoded && (decoded.id || decoded.userId || decoded._id)) {
          const userId = (decoded.id || decoded.userId || decoded._id).toString();
          const role = decoded.role || UserRole.USER;
          const isAgent = role === UserRole.ADMIN || role === UserRole.EMPLOYEE;
          const isUser = role === UserRole.USER;

          socket.data.auth = {
            userId,
            agentId: isAgent ? userId : undefined,
            agentName: decoded.name || (decoded.firstName ? `${decoded.firstName} ${decoded.lastName || ''}`.trim() : 'Litmus Staff'),
            agentRole: role,
            isAgent,
            isUser,
          };
        } else {
          socket.data.auth = { isGuest: true };
        }
      } else {
        socket.data.auth = { isGuest: true };
      }

      next();
    } catch (err: any) {
      logger.error(`[Socket Middleware Error]: ${err.message}`);
      next(); // Do not block guest connections
    }
  });

  // ── Connection Handler ───────────────────────────────────────────────────
  io.on('connection', (socket: Socket) => {
    const auth = socket.data.auth || {};
    logger.info(
      `[Socket Connected] id=${socket.id} isAgent=${Boolean(auth.isAgent)} userId=${auth.userId || 'Guest'}`
    );

    registerChatHandlers(io, socket);
  });

  // ── Queue SLA Timeout Worker (Runs every 60s) ────────────────────────────
  setInterval(async () => {
    try {
      const expired = await ChatService.checkAndExpireQueuedSessions(3);
      if (expired.length > 0) {
        logger.info(`[Queue SLA] Expired ${expired.length} unattended sessions to MISSED`);
        for (const sess of expired) {
          io.to(`chat_session_${sess.sessionId}`).emit('chat_ended', {
            sessionId: sess.sessionId,
            status: 'MISSED',
            message:
              'All of our specialists are currently assisting other clients. We have noted your request and our team will contact you shortly.',
          });
        }
        io.to('admin_support_channel').emit('sessions_expired', { count: expired.length });
      }
    } catch (err: any) {
      logger.error(`[Queue SLA Worker Error]: ${err.message}`);
    }
  }, 60 * 1000);

  logger.info('🚀 Socket.IO server successfully initialized and attached.');
  return io;
}

function parseCookie(cookieString: string, key: string): string | null {
  const match = cookieString.match(new RegExp('(^|;\\s*)(' + key + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}
