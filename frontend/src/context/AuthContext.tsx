import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  portalToken: string | null;
  portalCustomerEmail: string | null;
  activeRole: UserRole | 'PORTAL';
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: { name: string; email: string; password: string; role: UserRole }) => Promise<void>;
  loginAsRole: (role: UserRole | 'PORTAL') => Promise<void>;
  logout: () => void;
  switchAccount: () => void;
  requestPortalAccess: (email: string) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const SEEDED_ACCOUNTS = {
  ADMIN: { email: 'admin@dealflow360.com', name: 'David Wallace (Admin)', role: 'ADMIN' as UserRole },
  SALES_REP: { email: 'rep@dealflow360.com', name: 'Sarah Connor (Sales Rep)', role: 'SALES_REP' as UserRole },
  SALES_MANAGER: { email: 'manager@dealflow360.com', name: 'Michael Scott (Sales Manager)', role: 'SALES_MANAGER' as UserRole },
  FINANCE: { email: 'finance@dealflow360.com', name: 'Angela Martin (Finance)', role: 'FINANCE' as UserRole },
  PORTAL: { email: 'deals@apexenterprises.com', name: 'Apex Enterprises (Customer)', role: 'PORTAL' as const },
};

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

  const loginAsRole = async (role: UserRole | 'PORTAL') => {
    if (role === 'PORTAL') {
      const email = SEEDED_ACCOUNTS.PORTAL.email;
      const res = await authApi.portalMagicLink(email);
      setPortalToken(res.magicLinkToken);
      setPortalCustomerEmail(email);
      setActiveRole('PORTAL');
      localStorage.setItem('dealflow360_portal_token', res.magicLinkToken);
      localStorage.setItem('dealflow360_portal_email', email);
      return;
    }

    const account = SEEDED_ACCOUNTS[role];
    try {
      const res = await authApi.login(account.email, 'password123');
      setUser(res.user);
      setToken(res.token);
      setActiveRole(res.user.role);
      localStorage.setItem('dealflow360_token', res.token);
    } catch (e) {
      console.error(`Failed to login as ${role}:`, e);
    }
  };

  const requestPortalAccess = async (email: string) => {
    const res = await authApi.portalMagicLink(email);
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

    // 3. Clear any memory query caches if present
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
        loginAsRole,
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
