import React, { useState } from 'react';
import {
  Hexagon,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Building2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login, loginAsRole } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);
    try {
      await login(email, password);
      onLoginSuccess();
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error?.message || 'Invalid credentials. Please verify email and password.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPersonaLogin = async (role: UserRole | 'PORTAL') => {
    setErrorMessage('');
    setLoading(true);
    try {
      await loginAsRole(role);
      onLoginSuccess();
    } catch (err: any) {
      setErrorMessage('Failed to log in as selected persona.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
        {/* Left Side: Brand Visuals & Flow Summary */}
        <div className="md:col-span-5 bg-gradient-to-br from-[#0b2b68] to-blue-950 p-8 text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <div className="relative flex items-center justify-center">
                <Hexagon className="w-9 h-9 text-blue-400 stroke-[2.5]" />
                <div className="absolute w-3.5 h-3.5 bg-white rounded-full"></div>
              </div>
              <span className="text-2xl font-bold tracking-tight text-white">
                DealFlow<span className="text-blue-300 font-extrabold">360</span>
              </span>
            </div>

            <p className="text-blue-200 text-sm mt-4 leading-relaxed">
              Intelligent, self-governing B2B sales operations platform enforcing pricing discipline, warehouse auto-splits, and live customer collaboration.
            </p>
          </div>

          <div className="my-8 space-y-3">
            <div className="p-3.5 bg-blue-900/40 border border-blue-700/40 rounded-xl text-xs space-y-1">
              <span className="font-bold text-blue-200 block">✨ Multi-Tier Discount Governance</span>
              <p className="text-blue-300/80">
                Automated 2-level approval routing based on blended discount risk across categories.
              </p>
            </div>
            <div className="p-3.5 bg-blue-900/40 border border-blue-700/40 rounded-xl text-xs space-y-1">
              <span className="font-bold text-blue-200 block">📦 Multi-Warehouse Auto-Split</span>
              <p className="text-blue-300/80">
                Optimizes order fulfillment across Main Warehouse and East Depot to minimize shipping costs.
              </p>
            </div>
          </div>

          <div className="text-[11px] text-blue-300/60">
            Hackathon Edition &copy; 2025 DealFlow360
          </div>
        </div>

        {/* Right Side: Login Form & Persona Switcher */}
        <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Sign in to DealFlow360</h2>
            <p className="text-xs text-slate-500 mt-1">
              Access the Sales Workspace or Customer Deal Room.
            </p>

            {errorMessage && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                {errorMessage}
              </div>
            )}

            {/* Email & Password Form */}
            <form onSubmit={handleStandardLogin} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="name@dealflow360.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#0b2b68] hover:bg-blue-900 text-white rounded-xl text-sm font-bold shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-400 font-semibold">
                  Or 1-Click Demo Persona Login
                </span>
              </div>
            </div>

            {/* Quick Demo Persona Buttons */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickPersonaLogin('SALES_REP')}
                className="p-3 bg-slate-50 hover:bg-blue-50 text-slate-800 hover:text-blue-900 rounded-xl border border-slate-200 text-left transition"
              >
                <span className="font-bold block">💼 Sales Rep</span>
                <span className="text-[11px] text-slate-500">Sarah Connor</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickPersonaLogin('SALES_MANAGER')}
                className="p-3 bg-slate-50 hover:bg-amber-50 text-slate-800 hover:text-amber-900 rounded-xl border border-slate-200 text-left transition"
              >
                <span className="font-bold block">👔 Sales Manager</span>
                <span className="text-[11px] text-slate-500">Michael Scott</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickPersonaLogin('FINANCE')}
                className="p-3 bg-slate-50 hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 rounded-xl border border-slate-200 text-left transition"
              >
                <span className="font-bold block">💰 Finance Lead</span>
                <span className="text-[11px] text-slate-500">Angela Martin</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickPersonaLogin('ADMIN')}
                className="p-3 bg-slate-50 hover:bg-purple-50 text-slate-800 hover:text-purple-900 rounded-xl border border-slate-200 text-left transition"
              >
                <span className="font-bold block">👑 Administrator</span>
                <span className="text-[11px] text-slate-500">Full System Access</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleQuickPersonaLogin('PORTAL')}
              className="mt-2 w-full p-2.5 bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-800 rounded-xl border border-emerald-200 text-center font-bold text-xs transition"
            >
              🌐 Customer Portal View (Apex Enterprises)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
