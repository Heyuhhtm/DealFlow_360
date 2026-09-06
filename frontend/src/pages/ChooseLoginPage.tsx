import React, { useState } from 'react';
import {
  Hexagon,
  Users,
  Globe,
  ArrowRight,
  ShieldCheck,
  Briefcase,
  Lock,
  Mail,
  User as UserIcon,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Send,
  Building2,
} from 'lucide-react';
import { useAuth, DEMO_PORTAL_CUSTOMERS } from '../context/AuthContext';
import { UserRole } from '../types';

interface ChooseLoginPageProps {
  onLoginSuccess: () => void;
}

export const ChooseLoginPage: React.FC<ChooseLoginPageProps> = ({ onLoginSuccess }) => {
  const { login, signup, requestPortalAccess } = useAuth();

  // Selected flow: null (choice screen), 'internal' (team login), 'portal' (customer portal)
  const [selectedFlow, setSelectedFlow] = useState<'internal' | 'portal' | null>(null);

  // Internal Auth mode: 'signin' | 'signup'
  const [internalMode, setInternalMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Sign up fields
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpRole, setSignUpRole] = useState<UserRole>('SALES_REP');

  // Customer portal fields
  const [portalEmail, setPortalEmail] = useState(DEMO_PORTAL_CUSTOMERS[0].email);
  const [portalPassword, setPortalPassword] = useState(DEMO_PORTAL_CUSTOMERS[0].password);
  const [selectedCustomerName, setSelectedCustomerName] = useState(DEMO_PORTAL_CUSTOMERS[0].name);
  const [portalSent, setPortalSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleInternalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);
    try {
      await login(email, password);
      onLoginSuccess();
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error?.message || 'Invalid credentials. Please verify your email and password.'
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
      setSuccessMessage('Account registered successfully! Redirecting...');
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

  const handlePortalRequest = async (e?: React.FormEvent, customEmail?: string, customPassword?: string) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);
    const targetEmail = (customEmail || portalEmail).trim();
    const targetPassword = customPassword || portalPassword;
    try {
      await requestPortalAccess(targetEmail, targetPassword);
      setPortalSent(true);
      setTimeout(() => {
        onLoginSuccess();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error?.message || 'Failed to request portal access.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = (customer: typeof DEMO_PORTAL_CUSTOMERS[0], autoSubmit = false) => {
    setPortalEmail(customer.email);
    setPortalPassword(customer.password);
    setSelectedCustomerName(customer.name);
    setErrorMessage('');
    if (autoSubmit) {
      handlePortalRequest(undefined, customer.email, customer.password);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      {/* ================= STAGE 1: CHOICE SCREEN ================= */}
      {selectedFlow === null && (
        <div className="max-w-4xl w-full bg-white rounded-3xl border border-slate-200 shadow-2xl p-8 sm:p-12 text-center animate-in fade-in zoom-in-95 duration-200">
          {/* Logo & Header */}
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="relative flex items-center justify-center mb-3">
              <Hexagon className="w-12 h-12 text-blue-600 stroke-[2.5]" />
              <div className="absolute w-4 h-4 bg-[#0b2b68] rounded-full"></div>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              DealFlow<span className="text-blue-600">360</span>
            </h1>
            <p className="text-sm text-slate-500 mt-2 max-w-md">
              Choose your destination to begin your session or switch accounts.
            </p>
          </div>

          {/* Two Distinct Cards: Internal Team vs Customer Portal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8 text-left">
            {/* Card 1: Internal Team Login */}
            <div
              onClick={() => setSelectedFlow('internal')}
              className="group relative p-8 rounded-3xl border-2 border-slate-200 hover:border-blue-600 bg-gradient-to-b from-white to-slate-50/70 hover:to-blue-50/30 shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-5 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                  <Briefcase className="w-7 h-7 stroke-[2.2]" />
                </div>

                <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2.5 py-1 rounded-full uppercase tracking-wider border border-blue-200">
                  Staff &amp; Operations
                </span>

                <h2 className="text-xl font-bold text-slate-900 mt-3 group-hover:text-blue-700 transition-colors">
                  Internal Team Login
                </h2>

                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  For Sales Reps, Sales Managers, Finance Approvers, and Administrators to build quotes, review approvals, and manage fulfillment.
                </p>

                <ul className="mt-4 space-y-2 text-xs text-slate-600">
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Role-based vertical sidebar navigation</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Automated discount &amp; margin governance</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Multi-depot warehouse stock replenishment</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-200/80 flex items-center justify-between text-xs font-bold text-blue-700 group-hover:text-blue-800">
                <span>Sign In to Workspace</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 2: Customer Portal Login */}
            <div
              onClick={() => setSelectedFlow('portal')}
              className="group relative p-8 rounded-3xl border-2 border-slate-200 hover:border-emerald-600 bg-gradient-to-b from-white to-slate-50/70 hover:to-emerald-50/30 shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mb-5 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                  <Globe className="w-7 h-7 stroke-[2.2]" />
                </div>

                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-200">
                  Clients &amp; Enterprise Accounts
                </span>

                <h2 className="text-xl font-bold text-slate-900 mt-3 group-hover:text-emerald-700 transition-colors">
                  Customer Portal Login
                </h2>

                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  For enterprise customers to view active quotations, submit counter-discount requests, and sign agreements via secure magic link.
                </p>

                <ul className="mt-4 space-y-2 text-xs text-slate-600">
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Dedicated, self-contained Deal Room</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Live line-item counter-discount proposals</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>1-click instant confirmation within limits</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-200/80 flex items-center justify-between text-xs font-bold text-emerald-700 group-hover:text-emerald-800">
                <span>Enter Customer Deal Room</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Sessions are fully isolated. Switching accounts immediately clears prior tokens and memory caches.
          </p>
        </div>
      )}

      {/* ================= STAGE 2A: INTERNAL TEAM LOGIN FLOW ================= */}
      {selectedFlow === 'internal' && (
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in duration-200">
          {/* Left Hero Sidebar */}
          <div className="md:col-span-5 bg-gradient-to-br from-[#0b2b68] to-blue-950 p-8 text-white flex flex-col justify-between">
            <div>
              <button
                onClick={() => {
                  setSelectedFlow(null);
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="inline-flex items-center space-x-1 text-xs text-blue-200 hover:text-white mb-6 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Choose Workspace</span>
              </button>

              <div className="flex items-center space-x-3">
                <div className="relative flex items-center justify-center">
                  <Hexagon className="w-8 h-8 text-blue-400 stroke-[2.5]" />
                  <div className="absolute w-3 h-3 bg-white rounded-full"></div>
                </div>
                <span className="text-xl font-bold tracking-tight text-white">
                  DealFlow<span className="text-blue-300">360</span> Staff
                </span>
              </div>

              <p className="text-blue-200 text-xs mt-3 leading-relaxed">
                Sign in with your enterprise credentials or use the provided demo test accounts.
              </p>
            </div>

            <div className="my-6 space-y-2.5 text-xs text-blue-200/90">
              <div className="p-3 bg-blue-900/40 rounded-xl border border-blue-700/40">
                <span className="font-bold text-white block">👑 Administrator</span>
                <span>Full access to products, warehouses, reports &amp; governance.</span>
              </div>
              <div className="p-3 bg-blue-900/40 rounded-xl border border-blue-700/40">
                <span className="font-bold text-white block">💼 Sales Team</span>
                <span>Role-tailored navigation for reps &amp; approving managers.</span>
              </div>
            </div>

            <div className="text-[11px] text-blue-300/60">
              Protected by JWT Authentication &bull; RoleGuard Active
            </div>
          </div>

          {/* Right Login Form */}
          <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-between">
            <div>
              {/* Tab Switcher: Sign In vs Sign Up */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setInternalMode('signin');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    internalMode === 'signin'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInternalMode('signup');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    internalMode === 'signup'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-medium">
                  {successMessage}
                </div>
              )}

              {internalMode === 'signin' ? (
                <form onSubmit={handleInternalLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Work Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        required
                        placeholder="admin@dealflow360.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
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
                    className="w-full py-2.5 bg-[#0b2b68] hover:bg-blue-900 text-white rounded-xl text-sm font-bold shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                  >
                    <span>{loading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSignUp} className="space-y-3">
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
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
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
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Role
                      </label>
                      <select
                        value={signUpRole}
                        onChange={(e) => setSignUpRole(e.target.value as UserRole)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                      >
                        <option value="SALES_REP">Sales Rep</option>
                        <option value="SALES_MANAGER">Sales Manager</option>
                        <option value="FINANCE">Finance</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50 mt-2 cursor-pointer"
                  >
                    <span>{loading ? 'Creating...' : 'Register & Enter Workspace'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {/* Demo credentials reference block (strictly non-interactive reference for judges/testing) */}
              {internalMode === 'signin' && (
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

            <div className="pt-4 text-center">
              <button
                onClick={() => setSelectedFlow(null)}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium underline cursor-pointer"
              >
                ← Return to Login Choices
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= STAGE 2B: CUSTOMER PORTAL LOGIN FLOW ================= */}
      {selectedFlow === 'portal' && (
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in duration-200">
          {/* Left Hero Sidebar */}
          <div className="md:col-span-5 bg-gradient-to-br from-[#064e3b] to-emerald-950 p-8 text-white flex flex-col justify-between">
            <div>
              <button
                onClick={() => {
                  setSelectedFlow(null);
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="inline-flex items-center space-x-1 text-xs text-emerald-200 hover:text-white mb-6 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Choose Workspace</span>
              </button>

              <div className="flex items-center space-x-3">
                <div className="relative flex items-center justify-center">
                  <Globe className="w-8 h-8 text-emerald-400 stroke-[2.5]" />
                  <div className="absolute w-2.5 h-2.5 bg-white rounded-full"></div>
                </div>
                <span className="text-xl font-bold tracking-tight text-white">
                  Customer <span className="text-emerald-300">Deal Room</span>
                </span>
              </div>

              <p className="text-emerald-200 text-xs mt-3 leading-relaxed">
                Dedicated client portal to view negotiated quotes, counter-propose discounts, and accept formal proposals.
              </p>
            </div>

            <div className="my-6 space-y-2.5 text-xs text-emerald-100/90">
              <div className="p-3 bg-emerald-900/40 rounded-xl border border-emerald-700/40">
                <span className="font-bold text-white block flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Scoped Client Data Isolation</span>
                </span>
                <span className="text-[11px] text-emerald-200/80 mt-1 block">
                  Customers only access their own active deals, contract lines, and assigned account reps.
                </span>
              </div>
              <div className="p-3 bg-emerald-900/40 rounded-xl border border-emerald-700/40">
                <span className="font-bold text-white block flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Tier-Based Auto Limits</span>
                </span>
                <span className="text-[11px] text-emerald-200/80 mt-1 block">
                  Gold, Silver, and Bronze tiers enforce custom governance ceilings during live negotiations.
                </span>
              </div>
            </div>

            <div className="text-[11px] text-emerald-300/70 flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Protected by 256-bit Customer JWT &bull; Realtime Socket.io</span>
            </div>
          </div>

          {/* Right Login Form & Customer Directory */}
          <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-between">
            <div>
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-200">
                    Client Portal Access
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    Selected: <span className="font-bold text-slate-800">{selectedCustomerName}</span>
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-2">Sign In to Customer Deal Room</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your company email and password or click any pre-configured client below.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                  {errorMessage}
                </div>
              )}

              {portalSent && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-medium flex items-center justify-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Authenticated successfully! Opening {selectedCustomerName} Deal Room...</span>
                </div>
              )}

              <form onSubmit={handlePortalRequest} className="space-y-3.5 text-left">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Authorized Customer Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. deals@apexenterprises.com"
                      value={portalEmail}
                      onChange={(e) => {
                        setPortalEmail(e.target.value);
                        const match = DEMO_PORTAL_CUSTOMERS.find(
                          (c) => c.email.toLowerCase() === e.target.value.toLowerCase().trim()
                        );
                        if (match) setSelectedCustomerName(match.name);
                      }}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Password / Portal Passcode
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={portalPassword}
                      onChange={(e) => setPortalPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || portalSent}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer mt-1"
                >
                  <span>{loading ? 'Authenticating...' : `Enter ${selectedCustomerName} Deal Room`}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Demo Customer Reference Cards (Click to quick-fill or launch) */}
              <div className="mt-5 pt-4 border-t border-slate-200 text-left">
                <div className="p-3.5 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
                      Demo Client Personas (Click to Quick-Fill)
                    </span>
                    <span className="text-[10px] bg-emerald-200/80 text-emerald-800 font-mono font-semibold px-2 py-0.5 rounded-full">
                      Password: password123
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700 mb-2.5">
                    Select any company below to test customer-side quotations, tier discounts, and deal room negotiation:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {DEMO_PORTAL_CUSTOMERS.map((customer) => {
                      const isSelected = portalEmail.toLowerCase() === customer.email.toLowerCase();
                      return (
                        <div
                          key={customer.email}
                          onClick={() => handleSelectCustomer(customer, false)}
                          className={`p-2.5 rounded-xl border transition cursor-pointer select-none flex flex-col justify-between ${
                            isSelected
                              ? 'bg-emerald-100/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-slate-900 text-[11px]">
                                {customer.name}
                              </span>
                              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${customer.tierBadge}`}>
                                {customer.tier}
                              </span>
                            </div>
                            <span className="font-mono text-[10px] text-slate-600 block truncate">
                              {customer.email}
                            </span>
                            <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                              {customer.description}
                            </span>
                          </div>

                          <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-mono">pwd: password123</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectCustomer(customer, true);
                              }}
                              className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md transition cursor-pointer"
                            >
                              Launch →
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 text-center">
              <button
                onClick={() => setSelectedFlow(null)}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium underline cursor-pointer"
              >
                ← Return to Login Choices
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
