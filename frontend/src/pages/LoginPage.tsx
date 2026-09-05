import React, { useState } from 'react';
import {
  Hexagon,
  Lock,
  Mail,
  User as UserIcon,
  Briefcase,
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
  const { login, signup } = useAuth();

  // Mode: 'signin' | 'signup'
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  // Sign In fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Sign Up fields
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpRole, setSignUpRole] = useState<UserRole>('SALES_REP');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (signUpPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      await signup({
        name: signUpName.trim(),
        email: signUpEmail.trim(),
        password: signUpPassword,
        role: signUpRole,
      });
      setSuccessMessage('Account created successfully! Redirecting...');
      setTimeout(() => {
        onLoginSuccess();
      }, 600);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error?.message || 'Failed to create account. Email may already be registered.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
        {/* Left Side: Brand Visuals & Platform Highlights */}
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
              Intelligent B2B sales operations platform enforcing pricing discipline, warehouse auto-splits, and live customer collaboration.
            </p>
          </div>

          <div className="my-8 space-y-3">
            <div className="p-3.5 bg-blue-900/40 border border-blue-700/40 rounded-xl text-xs space-y-1">
              <span className="font-bold text-blue-200 block">✨ Multi-Tier Discount Governance</span>
              <p className="text-blue-300/80">
                Live blended risk scoring flags Manager and Finance sign-offs automatically.
              </p>
            </div>
            <div className="p-3.5 bg-blue-900/40 border border-blue-700/40 rounded-xl text-xs space-y-1">
              <span className="font-bold text-blue-200 block">📦 Multi-Warehouse Auto-Split</span>
              <p className="text-blue-300/80">
                Regional inventory allocation minimizes shipping freight costs.
              </p>
            </div>
            <div className="p-3.5 bg-blue-900/40 border border-blue-700/40 rounded-xl text-xs space-y-1">
              <span className="font-bold text-blue-200 block">🤝 Live Customer Deal Room</span>
              <p className="text-blue-300/80">
                Direct client negotiation portal with line-item comments and 1-click counter-proposals.
              </p>
            </div>
          </div>

          <div className="text-[11px] text-blue-300/60">
            Hackathon Edition &copy; 2025 DealFlow360
          </div>
        </div>

        {/* Right Side: Auth Tabs (Sign In / Sign Up) */}
        <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-between">
          <div>
            {/* Tab Switcher: Sign In vs Sign Up */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                  mode === 'signin'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                  mode === 'signup'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Create Account (Sign Up)
              </button>
            </div>

            <h2 className="text-2xl font-bold text-slate-900">
              {mode === 'signin' ? 'Sign in to DealFlow360' : 'Register New Account'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {mode === 'signin'
                ? 'Access your sales workspace with your enterprise credentials.'
                : 'Join DealFlow360 as a Sales Rep, Sales Manager, Finance, or Admin.'}
            </p>

            {errorMessage && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-medium">
                {successMessage}
              </div>
            )}

            {/* SIGN IN FORM */}
            {mode === 'signin' ? (
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
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium text-slate-900"
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
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-[#0b2b68] hover:bg-blue-900 text-white rounded-xl text-sm font-bold shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <span>{loading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              /* SIGN UP FORM */
              <form onSubmit={handleSignUp} className="mt-5 space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex Morgan"
                      value={signUpName}
                      onChange={(e) => setSignUpName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Work Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="alex@dealflow360.com"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Password (min 6 chars)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Platform Role
                    </label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select
                        value={signUpRole}
                        onChange={(e) => setSignUpRole(e.target.value as UserRole)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium text-slate-900"
                      >
                        <option value="SALES_REP">Sales Representative</option>
                        <option value="SALES_MANAGER">Sales Manager</option>
                        <option value="FINANCE">Finance Approver</option>
                        <option value="ADMIN">Administrator</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
                >
                  <span>{loading ? 'Creating Account...' : 'Complete Sign Up & Launch'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* Demo credentials reference block (strictly non-interactive reference for judges/testing) */}
            {mode === 'signin' && (
              <div className="mt-6 pt-5 border-t border-slate-200">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Demo credentials (for judges/testing)
                    </span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 font-mono font-semibold px-2 py-0.5 rounded-full">
                      Password: password123
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Type or copy credentials into the form fields above to authenticate via standard JWT:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 select-all">
                      <span className="font-bold font-sans text-blue-700 text-[11px] block">💼 Sales Rep</span>
                      <span className="text-slate-800 text-[11px] block">sarah@dealflow360.com</span>
                      <span className="text-[10px] text-slate-400 font-sans">Sarah Connor</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 select-all">
                      <span className="font-bold font-sans text-amber-700 text-[11px] block">👔 Sales Manager</span>
                      <span className="text-slate-800 text-[11px] block">michael@dealflow360.com</span>
                      <span className="text-[10px] text-slate-400 font-sans">Michael Scott</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 select-all">
                      <span className="font-bold font-sans text-emerald-700 text-[11px] block">💰 Finance</span>
                      <span className="text-slate-800 text-[11px] block">angela@dealflow360.com</span>
                      <span className="text-[10px] text-slate-400 font-sans">Angela Martin</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 select-all">
                      <span className="font-bold font-sans text-purple-700 text-[11px] block">👑 Admin</span>
                      <span className="text-slate-800 text-[11px] block">david@dealflow360.com</span>
                      <span className="text-[10px] text-slate-400 font-sans">David Wallace</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-6 text-center text-xs text-slate-500 border-t border-slate-100 mt-6">
            {mode === 'signin' ? (
              <span>
                Need a new user account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="font-bold text-blue-600 hover:text-blue-700 underline"
                >
                  Sign up now
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="font-bold text-blue-600 hover:text-blue-700 underline"
                >
                  Sign in
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
