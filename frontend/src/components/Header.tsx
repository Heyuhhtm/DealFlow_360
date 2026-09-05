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
  const { user, activeRole, logout, switchAccount } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  interface AlertNotification {
    id: string;
    title: string;
    description: string;
    targetTab: NavTab;
    colorClass: string;
    read: boolean;
  }

  const [notifications, setNotifications] = useState<AlertNotification[]>([
    {
      id: 'notif-1',
      title: 'Quotation Approval Required',
      description: 'Apex Enterprises quote has a 20% discount (exceeds 15% ceiling).',
      targetTab: 'approvals',
      colorClass: 'text-slate-900',
      read: false,
    },
    {
      id: 'notif-2',
      title: 'Stalled Deal Alert',
      description: 'Stark Logistics quotation has been inactive for 7 days.',
      targetTab: 'dealhealth',
      colorClass: 'text-amber-700',
      read: false,
    },
    {
      id: 'notif-3',
      title: 'Customer Counter-Discount',
      description: 'Wayne Technologies submitted a counter-discount request.',
      targetTab: 'portal',
      colorClass: 'text-emerald-700',
      read: false,
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleToggleNotifications = () => {
    if (!notificationsOpen) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
    setNotificationsOpen((prev) => !prev);
  };

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
              onClick={handleToggleNotifications}
              className="p-2 text-blue-100 hover:text-white hover:bg-blue-800/60 rounded-full relative transition cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-[#0b2b68] animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 text-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-sm text-slate-900 block">Notifications</span>
                    <span className="text-[10px] text-slate-400">
                      {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                    </span>
                  </div>
                  {notifications.length > 0 && (
                    <button
                      onClick={() => setNotifications([])}
                      className="text-xs text-slate-400 hover:text-rose-600 font-medium"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className="p-3 hover:bg-slate-50 cursor-pointer"
                        onClick={() => {
                          setNotifications((prev) =>
                            prev.map((item) => (item.id === n.id ? { ...item, read: true } : item))
                          );
                          setActiveTab(n.targetTab);
                          setNotificationsOpen(false);
                        }}
                      >
                        <div className={`font-medium ${n.colorClass}`}>{n.title}</div>
                        <div className="text-slate-500 mt-0.5">{n.description}</div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-400 text-xs">
                      No notifications
                    </div>
                  )}
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

                <div className="p-1.5 space-y-1">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      switchAccount();
                    }}
                    className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-100 text-slate-700 font-medium transition rounded-lg cursor-pointer"
                  >
                    <span>Switch Account</span>
                  </button>

                  <div className="border-t border-slate-100 my-1"></div>

                  {/* 
                    NOTE: Both 'Switch Account' and 'Log Out' intentionally perform an identical 
                    full reset (clearing internal JWT tokens, portal tokens, query caches, and local storage)
                    and redirect to /choose-login.
                  */}
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-rose-50 text-rose-700 font-bold transition rounded-lg cursor-pointer"
                  >
                    <span>Log Out</span>
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
