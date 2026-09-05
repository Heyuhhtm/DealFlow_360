import { Server as HttpServer } from 'node:http';
import { Server, Socket } from 'socket.io';
import prisma from './prisma';
import { verifyToken, AuthenticatedSession } from '../middleware/auth.middleware';

let io: Server | null = null;

export const initSocket = (httpServer: HttpServer, frontendUrl: string): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: frontendUrl || true,
      credentials: true,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Check handshake credentials if client passed auth on initial connect
    const handshakeToken =
      (socket.handshake.auth?.token as string) ||
      socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

    if (handshakeToken) {
      const session = verifyToken(handshakeToken);
      if (session) {
        socket.data.session = session;
        socket.emit('authenticated', {
          success: true,
          type: session.type,
          user: session,
        });
      }
    }

    // Explicit 'authenticate' event for internal JWT or portal token
    socket.on('authenticate', (data: { token?: string } | string) => {
      const token = typeof data === 'string' ? data : data?.token;

      if (!token) {
        socket.emit('error', {
          event: 'authenticate',
          message: 'Authentication token is required',
        });
        return;
      }

      const session = verifyToken(token);
      if (!session) {
        socket.emit('error', {
          event: 'authenticate',
          message: 'Invalid or expired token',
        });
        return;
      }

      socket.data.session = session;
      socket.emit('authenticated', {
        success: true,
        type: session.type,
        user: session,
      });
      console.log(`[Socket.io] Socket ${socket.id} authenticated as ${session.type}`);
    });

    // Handle 'join-quotation' event to join isolated room
    socket.on('join-quotation', async (data: { quotationId?: string } | string) => {
      const quotationId = typeof data === 'string' ? data : data?.quotationId;

      if (!quotationId) {
        socket.emit('error', {
          event: 'join-quotation',
          message: 'quotationId is required to join quotation channel',
        });
        return;
      }

      const session: AuthenticatedSession | undefined = socket.data.session;
      if (!session) {
        socket.emit('error', {
          event: 'join-quotation',
          message: 'Socket is not authenticated. Please emit "authenticate" first.',
        });
        return;
      }

      try {
        const quotation = await prisma.quotation.findUnique({
          where: { id: quotationId },
          select: { id: true, customerId: true },
        });

        if (!quotation) {
          socket.emit('error', {
            event: 'join-quotation',
            message: `Quotation ${quotationId} not found`,
          });
          return;
        }

        // Authorization check:
        // Internal staff (ADMIN, SALES_MANAGER, FINANCE, SALES_REP): allowed any quotation
        // Portal users: ONLY allowed if token customerId matches quotation customerId
        if (session.type === 'portal') {
          if (quotation.customerId !== session.customerId) {
            socket.emit('error', {
              event: 'join-quotation',
              message: 'Forbidden: You do not have permission to join this quotation channel',
            });
            return;
          }
        }

        const room = `quotation:${quotationId}`;
        socket.join(room);

        socket.emit('joined-quotation', {
          quotationId,
          room,
          success: true,
        });

        console.log(`[Socket.io] Socket ${socket.id} (${session.type}) joined room ${room}`);
      } catch (err: any) {
        console.error('[Socket.io] Error during join-quotation:', err);
        socket.emit('error', {
          event: 'join-quotation',
          message: 'Internal error joining quotation channel',
        });
      }
    });

    // Handle 'leave-quotation'
    socket.on('leave-quotation', (data: { quotationId?: string } | string) => {
      const quotationId = typeof data === 'string' ? data : data?.quotationId;
      if (quotationId) {
        const room = `quotation:${quotationId}`;
        socket.leave(room);
        socket.emit('left-quotation', { quotationId, room, success: true });
        console.log(`[Socket.io] Socket ${socket.id} left room ${room}`);
      }
    });

    // Handle real-time messaging directly over WebSocket
    socket.on('send-message', async (data: { quotationId: string; message: string; lineId?: string }) => {
      const session: AuthenticatedSession | undefined = socket.data.session;
      if (!session) {
        socket.emit('error', {
          event: 'send-message',
          message: 'Socket is not authenticated',
        });
        return;
      }

      const { quotationId, message, lineId } = data || {};
      if (!quotationId || !message?.trim()) {
        socket.emit('error', {
          event: 'send-message',
          message: 'quotationId and message are required',
        });
        return;
      }

      try {
        const quotation = await prisma.quotation.findUnique({
          where: { id: quotationId },
          select: { id: true, customerId: true },
        });

        if (!quotation) {
          socket.emit('error', {
            event: 'send-message',
            message: 'Quotation not found',
          });
          return;
        }

        if (session.type === 'portal' && quotation.customerId !== session.customerId) {
          socket.emit('error', {
            event: 'send-message',
            message: 'Forbidden: You do not have permission to message on this quotation',
          });
          return;
        }

        const author =
          session.type === 'portal'
            ? session.email || 'Customer'
            : session.name
            ? `${session.name} (${session.role})`
            : session.email || 'Sales Team';

        const comment = await prisma.portalComment.create({
          data: {
            quotationId,
            lineId: lineId || null,
            author,
            message: message.trim(),
          },
        });

        await prisma.quotation.update({
          where: { id: quotationId },
          data: { lastActivityAt: new Date() },
        });

        const payload = {
          id: comment.id,
          quotationId,
          lineId: comment.lineId,
          author: comment.author,
          message: comment.message,
          createdAt: comment.createdAt,
        };

        // Broadcast to all participants in this quotation's isolated room
        io?.to(`quotation:${quotationId}`).emit('new-comment', payload);
        io?.to(`quotation:${quotationId}`).emit('new-message', payload);
      } catch (err: any) {
        console.error('[Socket.io] Error in send-message:', err);
        socket.emit('error', {
          event: 'send-message',
          message: 'Failed to create comment',
        });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.io] Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
};

export const getIO = (): Server | null => io;

export { io };
