import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, User, Sparkles, Clock, CheckCircle } from 'lucide-react';
import { subscribeToQuotation } from '../services/socket';
import { portalApi, quotationsApi } from '../services/api';

export interface CommentMessage {
  id: string;
  quotationId?: string;
  lineId?: string | null;
  author: string;
  message: string;
  createdAt: string;
}

interface NegotiationThreadProps {
  quotationId: string;
  initialComments?: CommentMessage[];
  token: string;
  isPortal?: boolean;
  currentUserEmail?: string;
  currentUserName?: string;
  onStatusChanged?: (data: { quotationId: string; newStatus: string }) => void;
}

export const NegotiationThread: React.FC<NegotiationThreadProps> = ({
  quotationId,
  initialComments = [],
  token,
  isPortal = false,
  currentUserEmail,
  currentUserName,
  onStatusChanged,
}) => {
  const [comments, setComments] = useState<CommentMessage[]>(initialComments);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Real-time WebSocket room subscription
  useEffect(() => {
    if (!quotationId || !token) return;

    const unsubscribe = subscribeToQuotation({
      quotationId,
      token,
      onCommentReceived: (newComment: CommentMessage) => {
        setComments((prev) => {
          // Avoid duplicate messages
          if (prev.some((c) => c.id === newComment.id)) return prev;
          return [...prev, newComment];
        });
      },
      onStatusChanged: (data: any) => {
        if (onStatusChanged) {
          onStatusChanged(data);
        }
      },
    });

    return () => {
      unsubscribe();
    };
  }, [quotationId, token, onStatusChanged]);

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

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col h-[480px]">
      {/* Thread Header */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">
              Live Negotiation Thread
            </h4>
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Real-Time Push Active (WebSocket Connected)
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full">
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
            const isCounterOffer = (comment.message || '').includes('Proposed counter-discount:');

            if (isCounterOffer) {
              return (
                <div
                  key={comment.id || `${comment.createdAt}-${comment.author}`}
                  className="w-full my-2 p-3.5 bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-50 border border-amber-200 rounded-2xl shadow-2xs text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      ⚡ Counter-Discount Proposal ({comment.author})
                    </span>
                    <span className="text-amber-700 font-mono text-[10px]">
                      {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-amber-950 font-medium leading-relaxed bg-white/80 p-2.5 rounded-xl border border-amber-100">
                    {comment.message}
                  </p>
                </div>
              );
            }

            const authorLower = (comment.author || '').toLowerCase();
            const isMe = isPortal
              ? authorLower.includes('customer') || (currentUserEmail && authorLower.includes(currentUserEmail.toLowerCase()))
              : authorLower.includes('rep') || authorLower.includes('manager') || authorLower.includes('admin') || authorLower.includes('sales');

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
