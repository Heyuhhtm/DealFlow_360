import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

const SOCKET_SERVER_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
    : 'http://localhost:4000');

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log(`[Socket.io Client] Connected to real-time server: ${socket?.id}`);
    });

    socket.on('error', (err: any) => {
      console.warn('[Socket.io Client] Real-time error event:', err);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.io Client] Disconnected: ${reason}`);
    });
  }

  return socket;
};

export interface JoinQuotationOptions {
  quotationId: string;
  token: string;
  onCommentReceived?: (comment: any) => void;
  onQuotationUpdated?: (data: any) => void;
}

/**
 * Connect to an isolated quotation room with authentication and real-time event listeners.
 * Returns an unsubscribe cleanup function.
 */
export const subscribeToQuotation = ({
  quotationId,
  token,
  onCommentReceived,
  onQuotationUpdated,
}: JoinQuotationOptions): (() => void) => {
  const s = getSocket();

  // Authenticate first, then join room
  s.emit('authenticate', { token });
  s.emit('join-quotation', { quotationId });

  const handleComment = (comment: any) => {
    if (onCommentReceived && (!comment.quotationId || comment.quotationId === quotationId)) {
      onCommentReceived(comment);
    }
  };

  const handleUpdate = (data: any) => {
    if (onQuotationUpdated && (!data.quotationId || data.quotationId === quotationId)) {
      onQuotationUpdated(data);
    }
  };

  s.on('new-comment', handleComment);
  s.on('new-message', handleComment);
  s.on('quotation-updated', handleUpdate);

  return () => {
    s.emit('leave-quotation', { quotationId });
    s.off('new-comment', handleComment);
    s.off('new-message', handleComment);
    s.off('quotation-updated', handleUpdate);
  };
};
