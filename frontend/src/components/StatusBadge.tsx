import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const getBadgeStyle = (st: string) => {
    switch (st.toUpperCase()) {
      case 'APPROVED':
      case 'PAID':
      case 'CONFIRMED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PENDING_APPROVAL':
      case 'PENDING':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'UNDER_NEGOTIATION':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'REJECTED':
      case 'UNPAID':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'RETURNED':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'DRAFT':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const formatText = (st: string) => {
    return st.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeStyle(
        status
      )} ${className}`}
    >
      {formatText(status)}
    </span>
  );
};
