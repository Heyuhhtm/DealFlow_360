import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
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
      {/* Left Vertical Sidebar for all Internal Pages */}
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
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-blue-900/60 transition"
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
          {activeTab === 'dashboard' && <DashboardPage onNavigate={(tab) => setActiveTab(tab)} />}
          {activeTab === 'quotations' && <QuotationsPage />}
          {activeTab === 'approvals' && <ApprovalsPage />}
          {activeTab === 'fulfillment' && <FulfillmentPage />}
          {activeTab === 'subscriptions' && <SubscriptionsPage />}
          {activeTab === 'invoices' && <InvoicesPage onNavigateTab={(tab: any) => setActiveTab(tab)} />}
          {activeTab === 'dealhealth' && <DealHealthPage />}
          {activeTab === 'customers' && <CustomersPage />}
          {activeTab === 'warehouses' && <WarehousesPage />}
          {activeTab === 'reports' && <ReportsPage />}
          {activeTab === 'products' && <ProductsPage />}
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
