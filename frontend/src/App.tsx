import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header, NavTab } from './components/Header';
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

const AppContent: React.FC = () => {
  const { user, portalToken, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

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

  // If user is not logged in (neither internal user nor customer portal), display the Login & Sign Up page!
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

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      {/* Top Navy Header (#0b2b68) matching reference design */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main App Canvas */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-8">
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
        {activeTab === 'portal' && <CustomerPortalPage />}
        {activeTab === 'products' && <ProductsPage />}
      </main>

      {/* Trust & Features Footer matching reference design */}
      <Footer />
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
