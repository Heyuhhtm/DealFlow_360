import React, { useState, useRef, useEffect } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Hexagon,
  UserCheck,
  Users,
  Building2,
  BarChart3,
  LogOut,
  ChevronUp,
  X,
  Shield,
  User as UserIcon,
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

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}) => {
  const { user, activeRole, loginAsRole, logout } = useAuth();
  const [profilePopoverOpen, setProfilePopoverOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const popoverRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setProfilePopoverOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5 shrink-0" /> },
    { id: 'quotations', label: 'Quotations', icon: <FileText className="w-5 h-5 shrink-0" /> },
    { id: 'approvals', label: 'Approvals', icon: <CheckCircle2 className="w-5 h-5 shrink-0" /> },
    { id: 'fulfillment', label: 'Fulfillment', icon: <Boxes className="w-5 h-5 shrink-0" /> },
    { id: 'subscriptions', label: 'Subscriptions', icon: <RefreshCw className="w-5 h-5 shrink-0" /> },
    { id: 'invoices', label: 'Invoices', icon: <Receipt className="w-5 h-5 shrink-0" /> },
    { id: 'dealhealth', label: 'Deal Health', icon: <Activity className="w-5 h-5 shrink-0" /> },
    { id: 'customers', label: 'Customers', icon: <Users className="w-5 h-5 shrink-0" /> },
    { id: 'warehouses', label: 'Warehouses', icon: <Building2 className="w-5 h-5 shrink-0" /> },
    { id: 'reports', label: 'Reports', icon: <BarChart3 className="w-5 h-5 shrink-0" /> },
    { id: 'products', label: 'Products', icon: <Package className="w-5 h-5 shrink-0" /> },
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
    setProfilePopoverOpen(false);
    await loginAsRole(role);
    if (role === 'PORTAL') {
      setActiveTab('portal');
    } else if (role === 'SALES_MANAGER' || role === 'FINANCE') {
      setActiveTab('approvals');
    }
  };

  const handleNavClick = (tab: NavTab) => {
    setActiveTab(tab);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden animate-in fade-in"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 h-screen z-50 bg-[#0b2b68] text-white flex flex-col transition-all duration-300 border-r border-blue-900/60 shadow-2xl ${
          collapsed ? 'w-16' : 'w-60'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Section: Logo & Collapse Button */}
        <div className="h-16 flex items-center px-3 border-b border-blue-900/60 shrink-0">
          {!collapsed ? (
            <div className="flex items-center justify-between w-full">
              <div
                onClick={() => handleNavClick('dashboard')}
                className="flex items-center space-x-3 cursor-pointer overflow-hidden group flex-1"
              >
                <div className="relative flex items-center justify-center shrink-0">
                  <Hexagon className="w-8 h-8 text-blue-400 stroke-[2.5] group-hover:rotate-12 transition-transform duration-300" />
                  <div className="absolute w-3 h-3 bg-white rounded-full"></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold tracking-tight text-white leading-tight">
                    DealFlow<span className="text-blue-300 font-extrabold">360</span>
                  </span>
                  <span className="text-[10px] text-blue-200/70 uppercase tracking-widest font-mono">
                    Enterprise
                  </span>
                </div>
              </div>

              {/* Desktop collapse toggle */}
              <button
                onClick={() => setCollapsed(true)}
                className="hidden md:flex p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-blue-900/60 transition ml-1 shrink-0"
                title="Collapse sidebar to icon-only mode (64px)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Mobile close button */}
              <button
                onClick={() => setMobileOpen(false)}
                className="md:hidden p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-blue-900/60 transition ml-1 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="w-full flex items-center justify-center">
              <button
                onClick={() => setCollapsed(false)}
                className="relative group p-1.5 rounded-xl hover:bg-blue-900/60 transition flex items-center justify-center"
                title="Expand sidebar (240px)"
              >
                <Hexagon className="w-8 h-8 text-blue-400 stroke-[2.5] group-hover:rotate-12 transition-transform duration-300" />
                <div className="absolute w-3 h-3 bg-white rounded-full"></div>
                <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5 text-white shadow-xs group-hover:bg-blue-400 transition">
                  <ChevronRight className="w-2.5 h-2.5" />
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Middle Section: Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1 scrollbar-thin scrollbar-thumb-blue-800">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center transition-all duration-150 rounded-xl ${
                  collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5 space-x-3'
                } ${
                  isActive
                    ? 'bg-blue-600 text-white font-bold border-l-4 border-sky-400 shadow-md'
                    : 'text-blue-100/80 hover:text-white hover:bg-blue-900/60 font-medium'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-blue-300'}>{item.icon}</span>
                {!collapsed && <span className="text-xs tracking-wide">{item.label}</span>}
              </button>
            );
          })}

          {/* Quick Portal Switcher Item */}
          <div className="pt-2 border-t border-blue-900/60 my-2">
            <button
              onClick={() => handleNavClick('portal')}
              title={collapsed ? 'Customer Portal (Deal Room)' : undefined}
              className={`w-full flex items-center transition-all duration-150 rounded-xl ${
                collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5 space-x-3'
              } ${
                activeTab === 'portal'
                  ? 'bg-emerald-600 text-white font-bold border-l-4 border-white shadow-sm'
                  : 'text-emerald-300/90 hover:text-white hover:bg-emerald-950/60 font-medium'
              }`}
            >
              <Globe className="w-5 h-5 shrink-0 text-emerald-400" />
              {!collapsed && (
                <div className="flex items-center justify-between flex-1 text-left">
                  <span className="text-xs font-semibold">Customer Portal</span>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-200 px-1.5 py-0.5 rounded font-bold uppercase">
                    Live
                  </span>
                </div>
              )}
            </button>
          </div>
        </nav>

        {/* Bottom Section: Notifications & User Profile Popover */}
        <div className="border-t border-blue-900/70 p-2.5 space-y-2 bg-[#082255] shrink-0">
          {/* Notifications Bell Button */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className={`w-full flex items-center rounded-xl transition ${
                collapsed ? 'justify-center p-2' : 'px-3 py-2 justify-between'
              } text-blue-200 hover:text-white hover:bg-blue-900/60`}
              title="System Alerts & Notifications"
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Bell className="w-4 h-4" />
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                    3
                  </span>
                </div>
                {!collapsed && <span className="text-xs font-medium">Alerts & Nudges</span>}
              </div>
              {!collapsed && (
                <span className="text-[10px] bg-red-500/20 text-red-300 font-bold px-1.5 py-0.5 rounded-full">
                  3 New
                </span>
              )}
            </button>

            {/* Notifications Dropdown Panel */}
            {notificationsOpen && (
              <div className="absolute left-full bottom-0 ml-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 text-slate-800 py-2 z-50 animate-in fade-in slide-in-from-left-2">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                    Recent Alerts & Anomaly Nudges
                  </span>
                  <button
                    onClick={() => setNotificationsOpen(false)}
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="divide-y divide-slate-100 text-xs max-h-72 overflow-y-auto">
                  <div
                    className="p-3 hover:bg-slate-50 cursor-pointer"
                    onClick={() => {
                      setActiveTab('approvals');
                      setNotificationsOpen(false);
                    }}
                  >
                    <div className="font-semibold text-blue-700">Approval Required (High Risk)</div>
                    <div className="text-slate-500 mt-0.5">
                      Apex Enterprises discount overage exceeds threshold (&gt;5%).
                    </div>
                  </div>
                  <div
                    className="p-3 hover:bg-slate-50 cursor-pointer"
                    onClick={() => {
                      setActiveTab('dealhealth');
                      setNotificationsOpen(false);
                    }}
                  >
                    <div className="font-semibold text-amber-600">Stalled Deal Alert</div>
                    <div className="text-slate-500 mt-0.5">
                      Stark Logistics quotation inactive for 7+ days. Automated nudge ready.
                    </div>
                  </div>
                  <div
                    className="p-3 hover:bg-slate-50 cursor-pointer"
                    onClick={() => {
                      setActiveTab('portal');
                      setNotificationsOpen(false);
                    }}
                  >
                    <div className="font-semibold text-emerald-700">Customer Counter-Offer</div>
                    <div className="text-slate-500 mt-0.5">
                      Wayne Tech requested 15% discount counter-proposal.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile / Account Popover */}
          <div className="relative" ref={popoverRef}>
            <button
              onClick={() => setProfilePopoverOpen(!profilePopoverOpen)}
              className={`w-full flex items-center rounded-xl transition ${
                collapsed ? 'justify-center p-1.5' : 'p-2 space-x-2.5'
              } hover:bg-blue-900/60 bg-blue-950/40 border border-blue-800/50`}
              title={user?.name || getRoleDisplay()}
            >
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white shadow-inner shrink-0">
                {getRoleInitials()}
              </div>

              {!collapsed && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-xs font-bold text-white truncate leading-tight">
                    {user?.name || 'David Wallace'}
                  </p>
                  <p className="text-[10px] text-blue-200 truncate">{getRoleDisplay()}</p>
                </div>
              )}

              {!collapsed && <ChevronUp className="w-3.5 h-3.5 text-blue-300 shrink-0" />}
            </button>

            {/* Profile Popover Menu */}
            {profilePopoverOpen && (
              <div className="absolute left-full bottom-0 ml-3 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 text-slate-800 py-2 z-50 animate-in fade-in slide-in-from-left-2">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Current Account Session
                  </p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{getRoleDisplay()}</p>
                  <p className="text-xs text-blue-600 font-mono mt-0.5 truncate">
                    {user?.email || 'admin@dealflow360.com'}
                  </p>
                </div>

                {/* Profile Item */}
                <div className="p-1.5 border-b border-slate-100">
                  <button
                    onClick={() => {
                      setProfilePopoverOpen(false);
                      // In the future opens profile modal or settings
                    }}
                    className="w-full text-left px-3 py-2 text-xs flex items-center space-x-2.5 rounded-lg hover:bg-blue-50 text-slate-700 font-medium transition"
                  >
                    <UserIcon className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold">Profile & Account Settings</span>
                  </button>
                </div>

                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Switch Active Persona (Demo)
                  </div>

                  <button
                    onClick={() => handleRoleChange('ADMIN')}
                    className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-blue-50 ${
                      activeRole === 'ADMIN' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <span>👑 Admin User (David Wallace)</span>
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
                    <span>💰 Finance Lead (Angela Martin)</span>
                    {activeRole === 'FINANCE' && <UserCheck className="w-3.5 h-3.5 text-blue-600" />}
                  </button>

                  <div className="border-t border-slate-100 my-1"></div>

                  <button
                    onClick={() => handleRoleChange('PORTAL')}
                    className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-emerald-50 ${
                      activeRole === 'PORTAL' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <span>🌐 Customer Deal Room (Apex)</span>
                    {activeRole === 'PORTAL' && <UserCheck className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>

                  <div className="border-t border-slate-100 my-1"></div>

                  <button
                    onClick={() => {
                      setProfilePopoverOpen(false);
                      logout();
                      setActiveTab('dashboard');
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs flex items-center justify-between hover:bg-rose-50 text-rose-700 font-bold transition"
                  >
                    <span>Log Out</span>
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
