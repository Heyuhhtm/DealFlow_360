import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Sparkles, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';
import {
  connectAndAuthenticate,
  joinQuotationRoom,
  leaveQuotationRoom,
  getSocket,
} from '../lib/socket';
import { portalApi, quotationsApi } from '../services/api';

export interface CommentMessage {
  id: string;
  quotationId?: string;
  lineId?: string | null;
  author: string;
  authorType?: 'INTERNAL' | 'CUSTOMER';
  message: string;
  createdAt: string;
  isCounterProposal?: boolean;
  proposedDiscountPercent?: number;
  justification?: string;
  requiresApproval?: boolean;
  newBlendedRiskScore?: number;
}

interface NegotiationThreadProps {
  quotationId: string;
  initialComments?: CommentMessage[];
  token: string;
  isPortal?: boolean;
  currentUserEmail?: string;
  currentUserName?: string;
  currentStatus?: string;
  onStatusChanged?: (data: { quotationId: string; newStatus: string }) => void;
}

export const NegotiationThread: React.FC<NegotiationThreadProps> = ({
  quotationId,
  initialComments = [],
  token,
  isPortal = false,
  currentUserEmail,
  currentUserName,
  currentStatus,
  onStatusChanged,
}) => {
  const [comments, setComments] = useState<CommentMessage[]>(initialComments);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [connectionState, setConnectionState] = useState<'connected' | 'connecting' | 'reconnecting' | 'disconnected'>('connecting');
  const [liveStatus, setLiveStatus] = useState<string | undefined>(currentStatus);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Keep liveStatus in sync if parent prop changes
  useEffect(() => {
    if (currentStatus) {
      setLiveStatus(currentStatus);
    }
  }, [currentStatus]);

  // Sync initial comments if parent prop changes
  useEffect(() => {
    if (initialComments && initialComments.length > 0) {
      setComments((prev) => {
        const existingIds = new Set(prev.map((c) => c.id));
        const merged = [...prev];
        for (const c of initialComments) {
          if (!existingIds.has(c.id)) {
            merged.push(c);
            existingIds.add(c.id);
          }
        }
        return merged;
      });
    }
  }, [initialComments]);

  // Real-time WebSocket connection, authentication, room join, and live event listeners
  useEffect(() => {
    if (!quotationId || !token) return;

    // Connect & authenticate with user token (internal JWT or portal magic token)
    const socket = connectAndAuthenticate(token);
    joinQuotationRoom(quotationId);

    // Initial connection state check
    if (socket.connected) {
      setConnectionState('connected');
    } else {
      setConnectionState('connecting');
    }

    // Connection lifecycle handlers
    const handleConnect = () => setConnectionState('connected');
    const handleDisconnect = () => setConnectionState('reconnecting');
    const handleConnectError = () => setConnectionState('reconnecting');
    const handleReconnect = () => setConnectionState('connected');

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('reconnect', handleReconnect);

    // Listener for new-message
    const handleNewMessage = (newMsg: any) => {
      if (newMsg.quotationId && newMsg.quotationId !== quotationId) return;

      setComments((prev) => {
        // Deduplicate against messages already in state by id
        if (newMsg.id && prev.some((c) => c.id === newMsg.id)) {
          return prev;
        }

        // Deduplicate against identical author & message within 3 seconds
        const isDuplicate = prev.some(
          (c) =>
            c.author === newMsg.author &&
            c.message === newMsg.message &&
            Math.abs(new Date(c.createdAt).getTime() - new Date(newMsg.createdAt).getTime()) < 3000
        );
        if (isDuplicate) return prev;

        const isCounter = (newMsg.message || '').includes('Proposed counter-discount:');

        return [
          ...prev,
          {
            id: newMsg.id || `msg-${Date.now()}`,
            quotationId: newMsg.quotationId || quotationId,
            lineId: newMsg.lineId || null,
            author: newMsg.author || (newMsg.authorType === 'CUSTOMER' ? 'Customer' : 'Sales Rep'),
            authorType: newMsg.authorType,
            message: newMsg.message,
            createdAt: newMsg.createdAt || new Date().toISOString(),
            isCounterProposal: isCounter || newMsg.isCounterProposal,
            proposedDiscountPercent: newMsg.proposedDiscountPercent,
            justification: newMsg.justification,
            requiresApproval: newMsg.requiresApproval,
            newBlendedRiskScore: newMsg.newBlendedRiskScore,
          },
        ];
      });
    };

    // Listener for counter-discount-proposed
    const handleCounterDiscount = (data: any) => {
      if (data.quotationId && data.quotationId !== quotationId) return;

      const proposalEntry: CommentMessage = {
        id: `counter-${Date.now()}`,
        quotationId,
        lineId: data.lineId || null,
        author: isPortal ? 'Your Team (Customer Proposal)' : 'Customer Counter-Offer',
        authorType: 'CUSTOMER',
        message: `Proposed counter-discount: ${data.proposedDiscountPercent}%. Reason: ${data.justification}`,
        createdAt: new Date().toISOString(),
        isCounterProposal: true,
        proposedDiscountPercent: data.proposedDiscountPercent,
        justification: data.justification,
        requiresApproval: data.requiresApproval,
        newBlendedRiskScore: data.newBlendedRiskScore,
      };

      setComments((prev) => {
        // Prevent duplicate if new-message already arrived with same message
        const cleaned = prev.filter(
          (c) => !(c.message.includes(`Proposed counter-discount: ${data.proposedDiscountPercent}%`) && !c.isCounterProposal)
        );
        return [...cleaned, proposalEntry];
      });
    };

    // Listener for quotation-status-changed
    const handleStatusChanged = (data: { quotationId: string; newStatus: string }) => {
      if (!data.quotationId || data.quotationId === quotationId) {
        setLiveStatus(data.newStatus);
        if (onStatusChanged) {
          onStatusChanged(data);
        }
      }
    };

    socket.on('new-message', handleNewMessage);
    socket.on('new-comment', handleNewMessage);
    socket.on('counter-discount-proposed', handleCounterDiscount);
    socket.on('quotation-status-changed', handleStatusChanged);

    // Clean up all listeners and leave room on unmount
    return () => {
      leaveQuotationRoom(quotationId);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('reconnect', handleReconnect);
      socket.off('new-message', handleNewMessage);
      socket.off('new-comment', handleNewMessage);
      socket.off('counter-discount-proposed', handleCounterDiscount);
      socket.off('quotation-status-changed', handleStatusChanged);
    };
  }, [quotationId, token, isPortal, onStatusChanged]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      if (isPortal) {
        await portalApi.addComment(quotationId, { message: trimmed });
      } else {
        await quotationsApi.addComment(quotationId, { message: trimmed });
      }
      setInputText('');
    } catch (err: any) {
      console.error('Failed to send negotiation message:', err);
    } finally {
      setSending(false);
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'PENDING_APPROVAL':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'REJECTED':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'UNDER_NEGOTIATION':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col h-[500px]">
      {/* Thread Header */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-xs font-bold text-slate-900">
                Live Negotiation Thread
              </h4>
              {/* Dynamic Live Status Badge */}
              {liveStatus && (
                <span
                  className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border tracking-wide uppercase transition-all duration-300 ${getStatusBadgeStyle(
                    liveStatus
                  )}`}
                >
                  {liveStatus.replace(/_/g, ' ')}
                </span>
              )}
            </div>

            {/* Live Real-Time Connection Indicator */}
            <div className="flex items-center gap-1.5 mt-0.5 text-[11px]">
              {connectionState === 'connected' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-emerald-700 font-semibold">Live (Connected)</span>
                </>
              )}
              {connectionState === 'reconnecting' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                  <span className="text-amber-700 font-semibold">Reconnecting...</span>
                </>
              )}
              {connectionState === 'connecting' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  <span className="text-blue-700 font-semibold">Connecting...</span>
                </>
              )}
              {connectionState === 'disconnected' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  <span className="text-slate-500">Disconnected</span>
                </>
              )}
            </div>
          </div>
        </div>

        <span className="text-[10px] font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full shrink-0">
          {comments.length} Messages
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
        {comments.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <MessageSquare className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-600">No messages exchanged yet</p>
            <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
              Send a message to discuss pricing discounts, delivery terms, or request adjustments in real-time.
            </p>
          </div>
        ) : (
          comments.map((comment) => {
            const isCounterOffer =
              comment.isCounterProposal ||
              (comment.message || '').includes('Proposed counter-discount:');

            // Visually highlighted bubble for counter-discount proposals
            if (isCounterOffer) {
              const discountMatch = comment.message?.match(/(\d+)%/);
              const discountVal = comment.proposedDiscountPercent ?? (discountMatch ? discountMatch[1] : null);

              return (
                <div
                  key={comment.id || `${comment.createdAt}-${comment.author}`}
                  className="w-full my-2 p-3.5 bg-gradient-to-r from-amber-50 via-orange-50/80 to-amber-50 border-2 border-amber-300 rounded-2xl shadow-xs text-xs space-y-2 animate-in fade-in duration-200"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
                      <Sparkles className="w-4 h-4 text-amber-600 fill-amber-500/20" />
                      ⚡ Counter-Discount Proposal ({comment.author})
                    </span>
                    <span className="text-amber-800 font-mono text-[10px] bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200">
                      {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="bg-white/90 p-3 rounded-xl border border-amber-200/70 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">Proposed Counter Discount:</span>
                      <span className="font-extrabold text-amber-800 text-sm bg-amber-100 px-2.5 py-0.5 rounded-lg border border-amber-200">
                        {discountVal ? `${discountVal}%` : 'Special Request'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 leading-relaxed">
                      <span className="font-semibold text-slate-600">Customer Justification: </span>
                      <span className="italic text-slate-800">
                        {comment.justification ||
                          comment.message.replace(/^Proposed counter-discount:[^.]*\.\s*(Reason:\s*)?/, '') ||
                          comment.message}
                      </span>
                    </div>

                    {comment.requiresApproval !== undefined && (
                      <div className="pt-2 border-t border-amber-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Governance Clearance:</span>
                        <span
                          className={`font-bold px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 ${
                            comment.requiresApproval
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {comment.requiresApproval ? (
                            <>
                              <ShieldAlert className="w-3 h-3 text-rose-600" />
                              Requires Approval
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Auto-Approved
                            </>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            const authorLower = (comment.author || '').toLowerCase();
            const isMe = isPortal
              ? authorLower.includes('customer') || (currentUserEmail && authorLower.includes(currentUserEmail.toLowerCase()))
              : comment.authorType === 'INTERNAL' || authorLower.includes('rep') || authorLower.includes('manager') || authorLower.includes('admin') || authorLower.includes('sales');

            return (
              <div
                key={comment.id || `${comment.createdAt}-${comment.author}`}
                className={`flex flex-col max-w-[85%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                <div className="flex items-center space-x-1.5 mb-1 px-1 text-[10px] text-slate-400">
                  <span className="font-semibold text-slate-700">{comment.author}</span>
                  <span>&bull;</span>
                  <span>{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div
                  className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-br-xs'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{comment.message}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Footer */}
      <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            isPortal
              ? 'Type a message to the DealFlow360 sales team...'
              : 'Reply to customer in real-time...'
          }
          className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition placeholder:text-slate-400"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!inputText.trim() || sending}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
        >
          {sending ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
