import React from 'react';
import { MessageSquare, Sparkles, X, ExternalLink } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

interface NotificationToastProps {
  onOpenQuotation?: (quotationId: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ onOpenQuotation }) => {
  const { toast, dismissToast, clearQuotationNotifications } = useNotifications();

  if (!toast) return null;

  const isCounterOffer = toast.message.toLowerCase().includes('counter-discount') || toast.author.toLowerCase().includes('proposal');
  const quoteShort = toast.quotationId ? toast.quotationId.slice(0, 8) : 'Quote';

  const handleOpen = () => {
    if (toast.quotationId) {
      clearQuotationNotifications(toast.quotationId);
      if (onOpenQuotation) {
        onOpenQuotation(toast.quotationId);
      }
    }
    dismissToast();
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-in slide-in-from-bottom-5 fade-in duration-300 pointer-events-auto">
      <div
        className={`p-4 rounded-2xl shadow-2xl border ${
          isCounterOffer
            ? 'bg-gradient-to-r from-amber-500 to-orange-600 border-amber-400 text-white'
            : 'bg-slate-900 border-slate-700 text-white'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div
              className={`p-2 rounded-xl mt-0.5 ${
                isCounterOffer ? 'bg-white/20 text-white' : 'bg-blue-600 text-white'
              }`}
            >
              {isCounterOffer ? (
                <Sparkles className="w-4 h-4" />
              ) : (
                <MessageSquare className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h5 className="text-xs font-bold leading-snug">
                  New message from {toast.author}
                </h5>
              </div>
              <p className="text-[11px] opacity-80 mt-0.5 font-mono">
                Quote #{quoteShort}
              </p>
              <p className="text-xs mt-1.5 line-clamp-2 leading-relaxed opacity-95">
                "{toast.message}"
              </p>
            </div>
          </div>

          <button
            onClick={dismissToast}
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-3.5 pt-2.5 border-t border-white/15 flex items-center justify-between">
          <span className="text-[10px] opacity-75">
            {toast.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button
            onClick={handleOpen}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center space-x-1 transition cursor-pointer ${
              isCounterOffer
                ? 'bg-white text-orange-700 hover:bg-amber-50 shadow-xs'
                : 'bg-blue-600 text-white hover:bg-blue-500 shadow-xs'
            }`}
          >
            <span>View Deal & Reply</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
