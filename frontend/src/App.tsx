import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Sidebar, NavTab, ROLE_NAVIGATION_MAP, getRolesForTab } from './components/Sidebar';
import { RoleGuard } from './components/RoleGuard';
import { Footer } from './components/Footer';
import { DashboardPage } from './pages/DashboardPage';
import { QuotationsPage } from './pages/QuotationsPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { FulfillmentPage } from './pages/FulfillmentPage';
import { SubscriptionsPage } from './pages/SubscriptionsPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { CustomerPortalPage } from './pages/CustomerPortalPage';
import { ProductsPage } from './pages/ProductsPage';
import { DealHealthPage } from './pages/DealHealthPage';
import { CustomersPage } from './pages/CustomersPage';
import { WarehousesPage } from './pages/WarehousesPage';
import { ReportsPage } from './pages/ReportsPage';
import { LoginPage } from './pages/LoginPage';
import { Menu, Hexagon } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, portalToken, activeRole, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Automatically collapse to icon-only mode on smaller/tablet widths (< 1024px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Safeguard: If user's active role changes and they cannot access the current activeTab, return them to dashboard
  useEffect(() => {
    if (activeRole !== 'PORTAL') {
      const allowed = ROLE_NAVIGATION_MAP[activeRole] || ROLE_NAVIGATION_MAP.ADMIN;
      if (!allowed.includes(activeTab) && activeTab !== 'portal' && activeTab !== 'login') {
        setActiveTab('dashboard');
      }
    }
  }, [activeRole, activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Initializing DealFlow360...
        </p>
      </div>
    );
  }

  // If user is not logged in (neither internal user nor customer portal), display the Login & Sign Up page
  if (!user && !portalToken) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-slate-100">
        <div className="flex-1 flex items-center justify-center py-8">
          <LoginPage onLoginSuccess={() => setActiveTab('dashboard')} />
        </div>
        <Footer />
      </div>
    );
  }

  // Check if current session/view is the Customer Portal (Deal Room)
  // Per design specifications: Portal has its own separate top-bar style, not the vertical sidebar
  const isPortalView = activeTab === 'portal' || activeRole === 'PORTAL';

  if (isPortalView) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f8fafc]">
        {/* Customer Portal Top Bar */}
        <Header activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-8">
          <CustomerPortalPage />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      {/* Left Vertical Sidebar for all Internal Pages (Filtered by user role) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Mobile Top Header Bar with Hamburger Toggle (< md) */}
      <div className="md:hidden sticky top-0 z-30 bg-[#0b2b68] text-white px-4 py-3 flex items-center justify-between border-b border-blue-900/60 shadow-md">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-blue-900/60 transition cursor-pointer"
            title="Open Navigation Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-2">
            <div className="relative flex items-center justify-center">
              <Hexagon className="w-6 h-6 text-blue-400 stroke-[2.5]" />
              <div className="absolute w-2 h-2 bg-white rounded-full"></div>
            </div>
            <span className="font-bold text-base tracking-tight">
              DealFlow<span className="text-blue-300">360</span>
            </span>
          </div>
        </div>
        <span className="text-xs bg-blue-900/80 text-blue-200 px-2.5 py-1 rounded-full border border-blue-700/50 font-medium capitalize">
          {activeTab}
        </span>
      </div>

      {/* Main page content area shifted right to account for sidebar's width */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'md:pl-16' : 'md:pl-60'
        }`}
      >
        <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'login' && <LoginPage onLoginSuccess={() => setActiveTab('dashboard')} />}

          {activeTab === 'dashboard' && (
            <RoleGuard
              allowedRoles={getRolesForTab('dashboard')}
              onNavigateToDashboard={() => setActiveTab('dashboard')}
              pageName="Dashboard"
            >
              <DashboardPage onNavigate={(tab) => setActiveTab(tab)} />
            </RoleGuard>
          )}

          {activeTab === 'quotations' && (
            <RoleGuard
              allowedRoles={getRolesForTab('quotations')}
              onNavigateToDashboard={() => setActiveTab('dashboard')}
              pageName="Quotations Management"
            >
              <QuotationsPage />
            </RoleGuard>
          )}

          {activeTab === 'approvals' && (
            <RoleGuard
              allowedRoles={getRolesForTab('approvals')}
              onNavigateToDashboard={() => setActiveTab('dashboard')}
              pageName="Approvals Inbox"
            >
              <ApprovalsPage />
            </RoleGuard>
          )}

          {activeTab === 'fulfillment' && (
            <RoleGuard
              allowedRoles={getRolesForTab('fulfillment')}
              onNavigateToDashboard={() => setActiveTab('dashboard')}
              pageName="Fulfillment & Warehousing"
            >
              <FulfillmentPage />
            </RoleGuard>
          )}

          {activeTab === 'subscriptions' && (
            <RoleGuard
              allowedRoles={getRolesForTab('subscriptions')}
              onNavigateToDashboard={() => setActiveTab('dashboard')}
              pageName="Recurring Subscriptions"
            >
              <SubscriptionsPage />
            </RoleGuard>
          )}

          {activeTab === 'invoices' && (
            <RoleGuard
              allowedRoles={getRolesForTab('invoices')}
              onNavigateToDashboard={() => setActiveTab('dashboard')}
              pageName="Invoices & Payments"
            >
              <InvoicesPage onNavigateTab={(tab: any) => setActiveTab(tab)} />
            </RoleGuard>
          )}

          {activeTab === 'dealhealth' && (
            <RoleGuard
              allowedRoles={getRolesForTab('dealhealth')}
              onNavigateToDashboard={() => setActiveTab('dashboard')}
              pageName="Deal Health & Pipeline Analytics"
            >
              <DealHealthPage />
            </RoleGuard>
          )}

          {activeTab === 'customers' && (
            <RoleGuard
              allowedRoles={getRolesForTab('customers')}
              onNavigateToDashboard={() => setActiveTab('dashboard')}
              pageName="Customers Directory"
            >
              <CustomersPage />
            </RoleGuard>
          )}

          {activeTab === 'warehouses' && (
            <RoleGuard
              allowedRoles={getRolesForTab('warehouses')}
              onNavigateToDashboard={() => setActiveTab('dashboard')}
              pageName="Warehouses & Inventory Depots"
            >
              <WarehousesPage />
            </RoleGuard>
          )}

          {activeTab === 'reports' && (
            <RoleGuard
              allowedRoles={getRolesForTab('reports')}
              onNavigateToDashboard={() => setActiveTab('dashboard')}
              pageName="Sales & Financial Reports"
            >
              <ReportsPage />
            </RoleGuard>
          )}

          {activeTab === 'products' && (
            <RoleGuard
              allowedRoles={getRolesForTab('products')}
              onNavigateToDashboard={() => setActiveTab('dashboard')}
              pageName="Products Master Catalog"
            >
              <ProductsPage />
            </RoleGuard>
          )}
        </main>

        {/* Footer shifted along with content */}
        <Footer />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
