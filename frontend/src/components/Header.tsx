import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  CheckCircle2,
  Boxes,
  RefreshCw,
  Receipt,
  Activity,
  Package,
  Globe,
  Bell,
  ChevronDown,
  Hexagon,
  UserCheck,
  Users,
  Building2,
  BarChart3,
  LogOut,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export type NavTab =
  | 'dashboard'
  | 'quotations'
  | 'approvals'
  | 'fulfillment'
  | 'subscriptions'
  | 'invoices'
  | 'dealhealth'
  | 'customers'
  | 'warehouses'
  | 'reports'
  | 'products'
  | 'portal'
  | 'login';

interface HeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const { user, activeRole, loginAsRole, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'quotations', label: 'Quotations', icon: <FileText className="w-4 h-4" /> },
    { id: 'approvals', label: 'Approvals', icon: <CheckCircle2 className="w-4 h-4" /> },
    { id: 'fulfillment', label: 'Fulfillment', icon: <Boxes className="w-4 h-4" /> },
    { id: 'subscriptions', label: 'Subscriptions', icon: <RefreshCw className="w-4 h-4" /> },
    { id: 'invoices', label: 'Invoices', icon: <Receipt className="w-4 h-4" /> },
    { id: 'dealhealth', label: 'Deal Health', icon: <Activity className="w-4 h-4" /> },
    { id: 'customers', label: 'Customers', icon: <Users className="w-4 h-4" /> },
    { id: 'warehouses', label: 'Warehouses', icon: <Building2 className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'products', label: 'Products', icon: <Package className="w-4 h-4" /> },
    { id: 'portal', label: 'Portal', icon: <Globe className="w-4 h-4" /> },
  ];

  const getRoleInitials = () => {
    switch (activeRole) {
      case 'ADMIN':
        return 'AD';
      case 'SALES_REP':
        return 'SR';
      case 'SALES_MANAGER':
        return 'SM';
      case 'FINANCE':
        return 'FN';
      case 'PORTAL':
        return 'CP';
      default:
        return 'US';
    }
  };

  const getRoleDisplay = () => {
    switch (activeRole) {
      case 'ADMIN':
        return 'Admin User';
      case 'SALES_REP':
        return 'Sales Rep (Sarah)';
      case 'SALES_MANAGER':
        return 'Sales Manager (Michael)';
      case 'FINANCE':
        return 'Finance (Angela)';
      case 'PORTAL':
        return 'Customer Portal (Apex)';
      default:
        return user?.name || 'User';
    }
  };

  const handleRoleChange = async (role: UserRole | 'PORTAL') => {
    setDropdownOpen(false);
    await loginAsRole(role);
    if (role === 'PORTAL') {
      setActiveTab('portal');
    } else if (role === 'SALES_MANAGER' || role === 'FINANCE') {
      setActiveTab('approvals');
    }
  };

  return (
    <header className="bg-[#0b2b68] text-white sticky top-0 z-50 shadow-md border-b border-blue-900/40">
      <div className="max-w-[1600px] mx-auto px-4 flex items-center justify-between h-16">
        {/* Brand Logo */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="relative flex items-center justify-center">
            <Hexagon className="w-8 h-8 text-blue-400 stroke-[2.5]" />
            <div className="absolute w-3 h-3 bg-white rounded-full"></div>
          </div>
          <span className="text-xl font-bold tracking-tight text-white flex items-center">
            DealFlow<span className="text-blue-300 font-extrabold">360</span>
          </span>
        </div>

        {/* Navigation Tabs for Internal or Portal Notice for Customer */}
        {activeRole === 'PORTAL' ? (
          <div className="flex items-center space-x-2.5 bg-blue-900/60 border border-blue-400/30 px-4 py-1.5 rounded-full text-xs font-semibold text-blue-100 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Customer Deal Room &bull; Apex Enterprises Session</span>
          </div>
        ) : (
          <nav className="hidden xl:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-white text-[#0b2b68] shadow-sm font-bold'
                      : 'text-blue-100/90 hover:bg-blue-800/60 hover:text-white'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Right Side: Notifications & User Profile */}
        <div className="flex items-center space-x-4">
          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2 text-blue-100 hover:text-white hover:bg-blue-800/60 rounded-full relative transition"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-[#0b2b68]">
                3
              </span>
            </button>

            {/* Notifications Dropdown */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 text-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-900">Notifications</span>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">3 New</span>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 text-xs">
                  <div className="p-3 hover:bg-slate-50 cursor-pointer" onClick={() => { setActiveTab('approvals'); setNotificationsOpen(false); }}>
                    <div className="font-medium text-slate-900">Quotation Approval Required</div>
                    <div className="text-slate-500 mt-0.5">Apex Enterprises quote has a 20% discount (exceeds 15% ceiling).</div>
                  </div>
                  <div className="p-3 hover:bg-slate-50 cursor-pointer" onClick={() => { setActiveTab('dealhealth'); setNotificationsOpen(false); }}>
                    <div className="font-medium text-amber-700">Stalled Deal Alert</div>
                    <div className="text-slate-500 mt-0.5">Stark Logistics quotation has been inactive for 7 days.</div>
                  </div>
                  <div className="p-3 hover:bg-slate-50 cursor-pointer" onClick={() => { setActiveTab('portal'); setNotificationsOpen(false); }}>
                    <div className="font-medium text-emerald-700">Customer Counter-Discount</div>
                    <div className="text-slate-500 mt-0.5">Wayne Technologies submitted a counter-discount request.</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Avatar & Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2.5 bg-blue-900/50 hover:bg-blue-900/80 px-3 py-1.5 rounded-full border border-blue-700/50 transition cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white shadow-inner">
                {getRoleInitials()}
              </div>
              <span className="text-sm font-medium text-white max-w-[140px] truncate hidden md:inline">
                {getRoleDisplay()}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-blue-200" />
            </button>

            {/* Role Switcher Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 text-slate-800 py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs text-slate-500">Currently logged in as:</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{getRoleDisplay()}</p>
                  <p className="text-xs text-blue-600 font-mono mt-0.5">{user?.email || 'portal@dealflow360.com'}</p>
                </div>

                <div className="py-1">
                  <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Switch Active Persona
                  </div>

                  <button
                    onClick={() => handleRoleChange('ADMIN')}
                    className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-blue-50 ${
                      activeRole === 'ADMIN' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <span>👑 Admin User (Full Access)</span>
                    {activeRole === 'ADMIN' && <UserCheck className="w-3.5 h-3.5 text-blue-600" />}
                  </button>

                  <button
                    onClick={() => handleRoleChange('SALES_REP')}
                    className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-blue-50 ${
                      activeRole === 'SALES_REP' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <span>💼 Sales Rep (Sarah Connor)</span>
                    {activeRole === 'SALES_REP' && <UserCheck className="w-3.5 h-3.5 text-blue-600" />}
                  </button>

                  <button
                    onClick={() => handleRoleChange('SALES_MANAGER')}
                    className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-blue-50 ${
                      activeRole === 'SALES_MANAGER' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <span>👔 Sales Manager (Michael Scott)</span>
                    {activeRole === 'SALES_MANAGER' && <UserCheck className="w-3.5 h-3.5 text-blue-600" />}
                  </button>

                  <button
                    onClick={() => handleRoleChange('FINANCE')}
                    className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-blue-50 ${
                      activeRole === 'FINANCE' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <span>💰 Finance Approver (Angela Martin)</span>
                    {activeRole === 'FINANCE' && <UserCheck className="w-3.5 h-3.5 text-blue-600" />}
                  </button>

                  <div className="border-t border-slate-100 my-1"></div>

                  <button
                    onClick={() => handleRoleChange('PORTAL')}
                    className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-emerald-50 ${
                      activeRole === 'PORTAL' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <span>🌐 Customer Portal (Apex Enterprises)</span>
                    {activeRole === 'PORTAL' && <UserCheck className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>

                  <div className="border-t border-slate-100 my-1"></div>

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                      setActiveTab('dashboard');
                    }}
                    className="w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-rose-50 text-rose-700 font-semibold"
                  >
                    <span>🚪 Sign Out / Switch User</span>
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Direct Logout Button */}
          <button
            onClick={() => {
              logout();
              setActiveTab('dashboard');
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-blue-900/60 hover:bg-rose-900/80 text-blue-200 hover:text-white text-xs font-semibold border border-blue-700/50 hover:border-rose-600/50 transition shadow-sm"
            title="Sign Out of DealFlow360"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Secondary Mobile Nav for smaller viewports (Hidden in Customer Portal) */}
      {activeRole !== 'PORTAL' && (
        <div className="xl:hidden bg-[#071d47] px-4 py-2 overflow-x-auto flex space-x-2 border-t border-blue-900/50">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                  isActive ? 'bg-white text-[#0b2b68] font-bold' : 'text-blue-200 hover:text-white'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
