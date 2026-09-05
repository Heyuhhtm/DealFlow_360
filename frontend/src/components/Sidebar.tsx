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
  Bell,
  ChevronLeft,
  ChevronRight,
  Hexagon,
  Users,
  Building2,
  BarChart3,
  LogOut,
  ChevronUp,
  X,
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

/**
 * Role-Based Navigation Visibility Map
 * - ADMIN: sees everything
 * - SALES_MANAGER: sees Dashboard, Quotations, Approvals, Deal Health, Customers, Reports
 * - FINANCE: sees Dashboard, Approvals, Invoices, Subscriptions, Reports
 * - SALES_REP: sees Dashboard, Quotations, Fulfillment, Subscriptions, Deal Health
 */
export const ROLE_NAVIGATION_MAP: Record<UserRole, NavTab[]> = {
  ADMIN: [
    'dashboard',
    'quotations',
    'approvals',
    'fulfillment',
    'subscriptions',
    'invoices',
    'dealhealth',
    'customers',
    'warehouses',
    'reports',
    'products',
  ],
  SALES_MANAGER: [
    'dashboard',
    'quotations',
    'approvals',
    'dealhealth',
    'customers',
    'reports',
  ],
  FINANCE: [
    'dashboard',
    'approvals',
    'invoices',
    'subscriptions',
    'reports',
  ],
  SALES_REP: [
    'dashboard',
    'quotations',
    'fulfillment',
    'subscriptions',
    'dealhealth',
  ],
};

/**
 * Helper to get allowed roles for a given tab
 */
export const getRolesForTab = (tab: NavTab): UserRole[] => {
  return (Object.keys(ROLE_NAVIGATION_MAP) as UserRole[]).filter((role) =>
    ROLE_NAVIGATION_MAP[role].includes(tab)
  );
};

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
  const { user, logout, switchAccount } = useAuth();
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

  // Resolve current authenticated role from AuthContext user object
  const currentRole: UserRole = user?.role || 'ADMIN';
  const allowedTabs = ROLE_NAVIGATION_MAP[currentRole] || ROLE_NAVIGATION_MAP.ADMIN;

  // Filter the rendered nav links based on the current user's role from AuthContext
  const visibleNavItems = navItems.filter((item) => allowedTabs.includes(item.id));

  // Safeguard: the sidebar should never render a broken or empty link list
  const finalNavItems =
    visibleNavItems.length > 0 ? visibleNavItems : navItems.filter((item) => item.id === 'dashboard');

  const formatRoleLabel = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrator';
      case 'SALES_MANAGER':
        return 'Sales Manager';
      case 'SALES_REP':
        return 'Sales Representative';
      case 'FINANCE':
        return 'Finance Approver';
      default:
        return role ? role.replace(/_/g, ' ') : 'Staff Member';
    }
  };

  const getRoleInitials = () => {
    if (user?.name) {
      const parts = user.name.trim().split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return user.name.slice(0, 2).toUpperCase();
    }
    const role = user?.role;
    return role ? role.slice(0, 2).toUpperCase() : 'US';
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
          {finalNavItems.map((item) => {
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
              title={user?.name || formatRoleLabel(user?.role)}
            >
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white shadow-inner shrink-0">
                {getRoleInitials()}
              </div>

              {!collapsed && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-xs font-bold text-white truncate leading-tight">
                    {user?.name || 'Authenticated User'}
                  </p>
                  <p className="text-[10px] text-blue-200 truncate">{formatRoleLabel(user?.role)}</p>
                </div>
              )}

              {!collapsed && <ChevronUp className="w-3.5 h-3.5 text-blue-300 shrink-0" />}
            </button>

            {/* Profile Popover Menu */}
            {profilePopoverOpen && (
              <div className="absolute left-full bottom-0 ml-3 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 text-slate-800 py-2 z-50 animate-in fade-in slide-in-from-left-2">
                {/* 1. CURRENT ACCOUNT SESSION Header */}
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Current Account Session
                  </p>
                  <p className="text-sm font-bold text-slate-900 mt-1">
                    {user?.name || 'Authenticated User'}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                      {formatRoleLabel(user?.role)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-1 truncate">
                    {user?.email || 'user@dealflow360.com'}
                  </p>
                </div>

                {/* 2. Profile & Account Settings Link */}
                <div className="p-1.5 border-b border-slate-100">
                  <button
                    onClick={() => {
                      setProfilePopoverOpen(false);
                      // In the future opens profile modal or settings
                    }}
                    className="w-full text-left px-3 py-2 text-xs flex items-center space-x-2.5 rounded-lg hover:bg-slate-100 text-slate-700 font-medium transition cursor-pointer"
                  >
                    <UserIcon className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold">Profile & Account Settings</span>
                  </button>
                </div>

                {/* Actions: Switch Account & Log Out */}
                <div className="p-1.5 space-y-1">
                  {/* 5. Switch Account: Clears all tokens/caches and redirects to /choose-login */}
                  <button
                    onClick={() => {
                      setProfilePopoverOpen(false);
                      switchAccount();
                    }}
                    className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-100 text-slate-700 font-medium transition rounded-lg cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5">
                      <RefreshCw className="w-4 h-4 text-slate-500" />
                      <span className="font-semibold">Switch Account</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal">Reset Session</span>
                  </button>

                  <div className="border-t border-slate-100 my-1"></div>

                  {/* 
                    6. NOTE: Both 'Switch Account' and 'Log Out' intentionally perform an identical 
                    full reset (clearing internal JWT tokens, portal tokens, query caches, and local storage)
                    and redirect to /choose-login. There is no safe reason for one to be "softer" than the other,
                    as lingering tokens or cached role state risk cross-account data leakage.
                  */}
                  <button
                    onClick={() => {
                      setProfilePopoverOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-rose-50 text-rose-700 font-bold transition rounded-lg cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5">
                      <LogOut className="w-4 h-4 text-rose-600" />
                      <span>Log Out</span>
                    </div>
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
