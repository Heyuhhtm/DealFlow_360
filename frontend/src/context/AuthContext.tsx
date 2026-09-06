import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { authApi } from '../services/api';
import { disconnectSocket } from '../lib/socket';

interface AuthContextType {
  user: User | null;
  token: string | null;
  portalToken: string | null;
  portalCustomerEmail: string | null;
  activeRole: UserRole | 'PORTAL';
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: { name: string; email: string; password: string; role: UserRole }) => Promise<void>;
  logout: () => void;
  switchAccount: () => void;
  requestPortalAccess: (email: string, password?: string) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_CREDENTIALS = [
  { role: 'Sales Rep', name: 'Sarah Connor', email: 'sarah@dealflow360.com', password: 'password123', badgeColor: 'bg-blue-100 text-blue-800' },
  { role: 'Sales Manager', name: 'Michael Scott', email: 'michael@dealflow360.com', password: 'password123', badgeColor: 'bg-amber-100 text-amber-800' },
  { role: 'Finance', name: 'Angela Martin', email: 'angela@dealflow360.com', password: 'password123', badgeColor: 'bg-emerald-100 text-emerald-800' },
  { role: 'Admin', name: 'David Wallace', email: 'david@dealflow360.com', password: 'password123', badgeColor: 'bg-purple-100 text-purple-800' },
];

export const DEMO_PORTAL_CUSTOMERS = [
  {
    name: 'Apex Enterprises',
    tier: 'Gold Tier',
    tierBadge: 'bg-amber-100 text-amber-800 border-amber-300',
    email: 'deals@apexenterprises.com',
    password: 'password123',
    description: 'Tier-1 enterprise client with custom hardware & service agreements.',
  },
  {
    name: 'Wayne Technologies',
    tier: 'Silver Tier',
    tierBadge: 'bg-slate-200 text-slate-800 border-slate-300',
    email: 'procurement@waynetech.com',
    password: 'password123',
    description: 'High-volume tech account with approved procurement quotations.',
  },
  {
    name: 'Stark Logistics',
    tier: 'Bronze Tier',
    tierBadge: 'bg-orange-100 text-orange-800 border-orange-300',
    email: 'contact@starklogistics.io',
    password: 'password123',
    description: 'Global supply partner with live negotiations & monitor contracts.',
  },
  {
    name: 'Academic',
    tier: 'Bronze Tier',
    tierBadge: 'bg-sky-100 text-sky-800 border-sky-300',
    email: 'academiccom@123.in',
    password: 'password123',
    description: 'Education campus procurement for laptops & computing bundles.',
  },
];

export const DEMO_PORTAL_CUSTOMER = DEMO_PORTAL_CUSTOMERS[0];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('dealflow360_token'));
  const [portalToken, setPortalToken] = useState<string | null>(localStorage.getItem('dealflow360_portal_token'));
  const [portalCustomerEmail, setPortalCustomerEmail] = useState<string | null>(
    localStorage.getItem('dealflow360_portal_email')
  );
  const [activeRole, setActiveRole] = useState<UserRole | 'PORTAL'>('ADMIN');
  const [loading, setLoading] = useState<boolean>(true);

  // Restore session if valid token exists; otherwise remain logged out so user can sign in or sign up
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('dealflow360_token');
      const storedPortalToken = localStorage.getItem('dealflow360_portal_token');

      if (storedToken) {
        try {
          const profile = await authApi.getMe();
          setUser(profile);
          setActiveRole(profile.role);
          setToken(storedToken);
        } catch {
          // Token expired or invalid, clear it
          localStorage.removeItem('dealflow360_token');
          setUser(null);
          setToken(null);
        }
      } else if (storedPortalToken) {
        setPortalToken(storedPortalToken);
        setActiveRole('PORTAL');
      } else {
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setUser(res.user);
    setToken(res.token);
    setActiveRole(res.user.role);
    localStorage.setItem('dealflow360_token', res.token);
  };

  const signup = async (data: { name: string; email: string; password: string; role: UserRole }) => {
    const res = await authApi.signup(data);
    setUser(res.user);
    setToken(res.token);
    setActiveRole(res.user.role);
    localStorage.setItem('dealflow360_token', res.token);
  };

  const requestPortalAccess = async (email: string, password?: string) => {
    const res = await authApi.portalMagicLink(email, password);
    setPortalToken(res.magicLinkToken);
    setPortalCustomerEmail(email);
    localStorage.setItem('dealflow360_portal_token', res.magicLinkToken);
    localStorage.setItem('dealflow360_portal_email', email);
    return res.magicLinkToken;
  };

  /**
   * Full session reset: clears internal JWT, portal magic link, user state, and caches,
   * then redirects to /choose-login.
   */
  const switchAccount = () => {
    // 1. Wipe React context state
    setUser(null);
    setToken(null);
    setPortalToken(null);
    setPortalCustomerEmail(null);
    setActiveRole('ADMIN');

    // 2. Clear all auth tokens and cached identifiers in storage
    localStorage.removeItem('dealflow360_token');
    localStorage.removeItem('dealflow360_portal_token');
    localStorage.removeItem('dealflow360_portal_email');
    sessionStorage.clear();

    // 3. Disconnect real-time WebSocket connection and remove all listeners
    disconnectSocket();

    // 4. Clear any memory query caches if present
    if (typeof window !== 'undefined') {
      if ((window as any).__REACT_QUERY_CLIENT__) {
        (window as any).__REACT_QUERY_CLIENT__.clear();
      }
      window.history.replaceState(null, '', '/choose-login');
    }
  };

  /**
   * Standard logout: performs clean session reset and brings user to /choose-login
   */
  const logout = () => {
    switchAccount();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        portalToken,
        portalCustomerEmail,
        activeRole,
        loading,
        login,
        signup,
        logout,
        switchAccount,
        requestPortalAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
