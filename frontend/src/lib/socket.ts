import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

const SOCKET_SERVER_URL =
  import.meta.env.VITE_API_URL_BASE ||
  (import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
    : 'http://localhost:4000');

/**
 * Lazily creates and returns a single shared socket instance.
 * Note: uses server root URL (without /api) and autoConnect: false.
 */
export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_SERVER_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log(`[Socket.io Client] Connected to real-time server: ${socket?.id}`);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket.io Client] Connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.io Client] Disconnected: ${reason}`);
    });
  }

  return socket;
};

/**
 * Connects the socket if not already connected, then emits 'authenticate' with the JWT / magic token.
 */
export const connectAndAuthenticate = (token: string): Socket => {
  const s = getSocket();

  if (!s.connected) {
    s.connect();
  }

  if (token) {
    s.emit('authenticate', { token });
  }

  return s;
};

/**
 * Emits 'join-quotation' to enter an isolated quotation communication channel.
 */
export const joinQuotationRoom = (quotationId: string): void => {
  if (!quotationId) return;
  const s = getSocket();
  s.emit('join-quotation', { quotationId });
};

/**
 * Leaves a quotation room channel.
 */
export const leaveQuotationRoom = (quotationId: string): void => {
  if (!quotationId) return;
  const s = getSocket();
  s.emit('leave-quotation', { quotationId });
};

/**
 * Fully disconnects the socket and removes all listeners.
 * Called as part of switchAccount() and logout() flows to ensure
 * no socket connection or listeners survive an account switch.
 */
export const disconnectSocket = (): void => {
  if (socket) {
    try {
      socket.removeAllListeners();
      socket.disconnect();
    } catch (err) {
      console.warn('[Socket.io Client] Error disconnecting socket:', err);
    } finally {
      socket = null;
    }
  }
};

export interface JoinQuotationOptions {
  quotationId: string;
  token: string;
  onCommentReceived?: (comment: any) => void;
  onQuotationUpdated?: (data: any) => void;
  onCounterDiscountProposed?: (data: any) => void;
  onStatusChanged?: (data: any) => void;
}

/**
 * Convenience helper to connect, authenticate, join room, and subscribe to events.
 * Returns a cleanup unsubscribe function.
 */
export const subscribeToQuotation = ({
  quotationId,
  token,
  onCommentReceived,
  onQuotationUpdated,
  onCounterDiscountProposed,
  onStatusChanged,
}: JoinQuotationOptions): (() => void) => {
  const s = connectAndAuthenticate(token);
  joinQuotationRoom(quotationId);

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

  const handleCounter = (data: any) => {
    if (onCounterDiscountProposed) {
      onCounterDiscountProposed(data);
    }
  };

  const handleStatus = (data: any) => {
    if (onStatusChanged && (!data.quotationId || data.quotationId === quotationId)) {
      onStatusChanged(data);
    }
  };

  s.on('new-comment', handleComment);
  s.on('new-message', handleComment);
  s.on('quotation-updated', handleUpdate);
  s.on('counter-discount-proposed', handleCounter);
  s.on('quotation-status-changed', handleStatus);

  return () => {
    leaveQuotationRoom(quotationId);
    s.off('new-comment', handleComment);
    s.off('new-message', handleComment);
    s.off('quotation-updated', handleUpdate);
    s.off('counter-discount-proposed', handleCounter);
    s.off('quotation-status-changed', handleStatus);
  };
};
