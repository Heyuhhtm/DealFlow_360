import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { Lock, ArrowLeft, ShieldAlert } from 'lucide-react';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  onNavigateToDashboard?: () => void;
  pageName?: string;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  children,
  onNavigateToDashboard,
  pageName,
}) => {
  const { user, activeRole } = useAuth();

  // Determine current active internal role
  const currentRole: UserRole = (activeRole !== 'PORTAL' ? (activeRole as UserRole) : user?.role) || 'ADMIN';

  const isAllowed = allowedRoles.includes(currentRole);

  if (!isAllowed) {
    return (
      <div className="min-h-[460px] flex items-center justify-center p-6 animate-in fade-in duration-200">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600 mb-4 shadow-xs">
            <Lock className="w-7 h-7 stroke-[2.2]" />
          </div>

          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Restricted Route</span>
          </div>

          <h2 className="text-xl font-extrabold text-slate-900 mt-2">
            Access Denied
          </h2>

          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            You don't have permission to view {pageName ? <strong className="text-slate-800 font-semibold">{pageName}</strong> : 'this page'}.
            This section is restricted to:
          </p>

          <div className="flex flex-wrap items-center justify-center gap-1.5 my-4">
            {allowedRoles.map((role) => (
              <span
                key={role}
                className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200"
              >
                {role}
              </span>
            ))}
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 mb-6">
            Your current logged-in role is <span className="font-bold text-blue-700 font-mono">{currentRole}</span>.
          </div>

          {onNavigateToDashboard && (
            <button
              onClick={onNavigateToDashboard}
              className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-[#0b2b68] hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
