import React from 'react';
import {
  Hexagon,
  LogOut,
  ShieldCheck,
  FileText,
  MessageSquare,
  User as UserIcon,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type PortalRoute = 'quotation' | 'messages' | 'profile';

interface PortalLayoutProps {
  currentRoute: PortalRoute;
  onRouteChange: (route: PortalRoute) => void;
  children: React.ReactNode;
  isPreview?: boolean;
  onExitPreview?: () => void;
}

export const PortalLayout: React.FC<PortalLayoutProps> = ({
  currentRoute,
  onRouteChange,
  children,
  isPreview = false,
  onExitPreview,
}) => {
  const { portalCustomerEmail, logout, switchAccount } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-800">
      {/* If this is Preview Mode for internal staff, show prominent top banner */}
      {isPreview && (
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs font-semibold z-50">
          <div className="flex items-center space-x-2">
            <span className="bg-white/20 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-white/20">
              Staff Preview Mode
            </span>
            <span>
              Previewing Customer Deal Room (Apex Enterprises). Your internal staff session remains intact.
            </span>
          </div>
          {onExitPreview && (
            <button
              onClick={onExitPreview}
              className="bg-white text-amber-900 hover:bg-amber-50 px-3 py-1 rounded-lg font-bold text-xs shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Staff App</span>
            </button>
          )}
        </div>
      )}

      {/* Customer Portal Top Bar Navigation */}
      <header className="bg-[#0b2b68] text-white sticky top-0 z-40 shadow-lg border-b border-blue-900/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand Logo & Customer Deal Room Badge */}
          <div className="flex items-center space-x-3">
            <div className="relative flex items-center justify-center">
              <Hexagon className="w-8 h-8 text-blue-400 stroke-[2.5]" />
              <div className="absolute w-3 h-3 bg-white rounded-full"></div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold tracking-tight text-white leading-tight">
                  DealFlow<span className="text-blue-300 font-extrabold">360</span>
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30 font-bold uppercase tracking-wide">
                  Customer Deal Room
                </span>
              </div>
              <div className="flex items-center space-x-1 text-[11px] text-blue-200/80">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Encrypted Magic Link &bull; Apex Enterprises Session</span>
              </div>
            </div>
          </div>

          {/* Customer Portal Navigation Links */}
          <nav className="hidden sm:flex items-center space-x-1 bg-blue-950/60 p-1 rounded-xl border border-blue-800/40">
            <button
              onClick={() => onRouteChange('quotation')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                currentRoute === 'quotation'
                  ? 'bg-blue-600 text-white shadow-sm font-bold'
                  : 'text-blue-200 hover:text-white hover:bg-blue-900/40'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Quotation &amp; Terms</span>
            </button>

            <button
              onClick={() => onRouteChange('messages')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                currentRoute === 'messages'
                  ? 'bg-blue-600 text-white shadow-sm font-bold'
                  : 'text-blue-200 hover:text-white hover:bg-blue-900/40'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Negotiation Thread</span>
            </button>

            <button
              onClick={() => onRouteChange('profile')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                currentRoute === 'profile'
                  ? 'bg-blue-600 text-white shadow-sm font-bold'
                  : 'text-blue-200 hover:text-white hover:bg-blue-900/40'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              <span>Organization Profile</span>
            </button>
          </nav>

          {/* Right Side: Customer Account Info & Sign Out */}
          <div className="flex items-center space-x-3">
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-white">Apex Enterprises Inc.</p>
              <p className="text-[11px] text-blue-200/80 font-mono">
                {portalCustomerEmail || 'deals@apexenterprises.com'}
              </p>
            </div>

            {!isPreview ? (
              <div className="flex items-center space-x-2">
                <button
                  onClick={switchAccount}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-900/50 hover:bg-blue-800 text-blue-200 hover:text-white border border-blue-700/60 text-xs font-semibold transition cursor-pointer"
                  title="Switch to another account or team login"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Switch Account</span>
                </button>

                <button
                  onClick={logout}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-200 hover:text-white border border-rose-500/30 text-xs font-bold transition cursor-pointer"
                  title="Log out of Customer Portal"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onExitPreview}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white border border-white/30 text-xs font-bold transition cursor-pointer"
                title="Exit preview and return to staff app"
              >
                <span>Exit Preview</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Subbar */}
        <div className="sm:hidden flex items-center justify-around border-t border-blue-900/50 bg-[#082255] px-2 py-1 text-xs">
          <button
            onClick={() => onRouteChange('quotation')}
            className={`py-1.5 px-2 font-semibold ${
              currentRoute === 'quotation' ? 'text-white border-b-2 border-blue-400 font-bold' : 'text-blue-300'
            }`}
          >
            Quotation
          </button>
          <button
            onClick={() => onRouteChange('messages')}
            className={`py-1.5 px-2 font-semibold ${
              currentRoute === 'messages' ? 'text-white border-b-2 border-blue-400 font-bold' : 'text-blue-300'
            }`}
          >
            Thread
          </button>
          <button
            onClick={() => onRouteChange('profile')}
            className={`py-1.5 px-2 font-semibold ${
              currentRoute === 'profile' ? 'text-white border-b-2 border-blue-400 font-bold' : 'text-blue-300'
            }`}
          >
            Profile
          </button>
        </div>
      </header>

      {/* Main Page Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* Customer Portal Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-700">DealFlow360 Customer Deal Room</span>
            <span>&bull;</span>
            <span>Confidential Negotiation Portal</span>
          </div>
          <div className="flex items-center space-x-3 text-slate-400">
            <span>Customer Support: support@dealflow360.com</span>
            <span>&bull;</span>
            <span>Powered by Apex Enterprises Deal Engine</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
