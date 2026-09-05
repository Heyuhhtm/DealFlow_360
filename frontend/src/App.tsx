import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
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
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

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
