import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useRouter } from './router/Router';
import { useApp } from './context/AppContext';
import { AdminSidebar } from './components/AdminSidebar';
import { CustomerSidebar } from './components/CustomerSidebar';
import { Header } from './components/Header';
import { ToastContainer } from './components/ToastContainer';
import { HardwareSimWidget } from './components/HardwareSimWidget';
import { DemoToolbar } from './components/DemoToolbar';
import { AccessDenied } from './components/AccessDenied';

// Admin Pages
import { DashboardPage } from './pages/DashboardPage';
import { BinMonitoringPage } from './pages/BinMonitoringPage';
import { BinDetailsPage } from './pages/BinDetailsPage';
import { ComplaintsPage } from './pages/ComplaintsPage';
import { QRManagementPage } from './pages/QRManagementPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { PlannerPage } from './pages/PlannerPage';
import { EVFleetPage } from './pages/EVFleetPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { SettingsPage } from './pages/SettingsPage';
import { ActivityLogPage } from './pages/ActivityLogPage';

// Customer Pages
import { CustomerDashboardPage } from './pages/customer/CustomerDashboardPage';
import { MyReportsPage } from './pages/customer/MyReportsPage';
import { MyContributionsPage } from './pages/customer/MyContributionsPage';
import { CustomerFeedbackPage } from './pages/customer/CustomerFeedbackPage';
import { CustomerProfilePage } from './pages/customer/CustomerProfilePage';

// Public / Guest Pages
import { LoginPage } from './pages/LoginPage';
import { CitizenReportPage } from './pages/CitizenReportPage';
import { ComplaintSuccessPage } from './pages/ComplaintSuccessPage';
import { BinIdentificationPage } from './pages/BinIdentificationPage';

export const App: React.FC = () => {
  const { currentPath, params, navigate } = useRouter();
  const { currentUser, authLoading, isAuthenticated, isAdmin, isCustomer, bins } = useApp();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [hardwareSimModalOpen, setHardwareSimModalOpen] = useState(false);

  // 1. Loading Authentication State (Prevents flash of protected content / access denied)
  if (authLoading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg animate-pulse">
            <Trash2 className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-800">HAILO Digital Hub</h3>
            <p className="text-xs text-slate-500 font-medium">Verifying security credentials...</p>
          </div>
        </div>
      </main>
    );
  }

  // 2. Public Citizen QR Success Receipt (Can be viewed after report submission)
  if (currentPath.startsWith('/report/success')) {
    return (
      <main className="min-h-screen bg-slate-50">
        <ToastContainer />
        <ComplaintSuccessPage complaintId={params.complaintId} />
      </main>
    );
  }

  // 3. Unauthenticated Users: Redirect to Login/Registration and preserve scanned bin return URL (e.g. /report/BIN-002)
  if (!isAuthenticated || currentPath === '/login') {
    if (currentPath.startsWith('/report') && typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('hailo_return_to', currentPath);
      } catch {}
    }
    return (
      <main className="min-h-screen bg-slate-50">
        <ToastContainer />
        <LoginPage />
      </main>
    );
  }

  // 4. Authenticated Citizen Incident Report
  if (currentPath.startsWith('/report')) {
    if (params.binCode) {
      return (
        <main className="min-h-screen bg-slate-50">
          <ToastContainer />
          <CitizenReportPage binCode={params.binCode} />
        </main>
      );
    }

    return (
      <main className="min-h-screen bg-slate-50">
        <ToastContainer />
        <BinIdentificationPage />
      </main>
    );
  }

  // 3. Routing: Customer Portal vs Admin Portal
  const isCustomerRoute = currentPath.startsWith('/customer');

  // Customer Portal Views
  if (isCustomerRoute || (isCustomer && currentPath === '/')) {
    const getCustomerHeader = () => {
      if (currentPath === '/customer/reports') return { title: 'My Reports', subtitle: 'Incidents submitted by you' };
      if (currentPath === '/customer/contributions') return { title: 'My Contributions', subtitle: 'Calculated community cleanliness statistics' };
      if (currentPath === '/customer/feedback') return { title: 'Feedback', subtitle: 'Help us improve HAILO Digital Hub' };
      if (currentPath === '/customer/profile') return { title: 'Profile', subtitle: 'Your citizen account details' };
      return { title: 'Home', subtitle: 'Welcome to HAILO Citizen Portal' };
    };

    const cHeader = getCustomerHeader();

    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex">
        <ToastContainer />
        <CustomerSidebar mobileOpen={mobileSidebarOpen} setMobileOpen={setMobileSidebarOpen} />

        <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
          <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{cHeader.title}</h2>
              <p className="text-xs text-slate-500 font-medium">{cHeader.subtitle}</p>
            </div>
            <button
              onClick={() => navigate('/report')}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
            >
              Scan / Report
            </button>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-16">
            {(currentPath === '/' || currentPath === '/customer' || currentPath === '/customer/dashboard') && (
              <CustomerDashboardPage />
            )}
            {currentPath === '/customer/reports' && (
              <MyReportsPage />
            )}
            {currentPath === '/customer/contributions' && (
              <MyContributionsPage />
            )}
            {currentPath === '/customer/feedback' && (
              <CustomerFeedbackPage />
            )}
            {currentPath === '/customer/profile' && (
              <CustomerProfilePage />
            )}
          </main>
        </div>
      </div>
    );
  }

  // 4. ADMIN PORTAL (Restricted to verified ADMIN role only)
  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <ToastContainer />
        <AccessDenied requiredRole="ADMIN" />
      </main>
    );
  }

  const getAdminHeader = () => {
    if (currentPath === '/admin/bins' || currentPath === '/bins') return { title: 'Bin Management', subtitle: 'Fleet monitoring, CRUD configuration & automatic QR generation' };
    if (currentPath.includes('/bins/')) return { title: `Bin Profile: ${params.binCode || ''}`, subtitle: 'Ultrasonic telemetry, fill curve & permanent QR placard' };
    if (currentPath === '/admin/complaints' || currentPath === '/complaints') return { title: 'Complaints', subtitle: 'Citizen incident reports and autonomous EV dispatch status' };
    if (currentPath === '/admin/qr' || currentPath === '/qr-management') return { title: 'QR Management', subtitle: 'Physical placards, batch sticker sheet printing & URL links' };
    if (currentPath === '/admin/analytics' || currentPath === '/analytics') return { title: 'Analytics', subtitle: 'Admin-exclusive waste diversion trends & collection frequency' };
    if (currentPath === '/admin/planner' || currentPath === '/planner') return { title: 'Collection Planner', subtitle: 'Autonomous EV dispatch tasks and scheduled routes' };
    if (currentPath === '/admin/ev') return { title: 'EV Fleet', subtitle: 'Autonomous collection vehicle tracking & simulation testbench' };
    if (currentPath === '/admin/feedback' || currentPath === '/feedback') return { title: 'Feedback Desk', subtitle: 'Actual stakeholder and citizen satisfaction ratings' };
    if (currentPath === '/admin/settings' || currentPath === '/settings') return { title: 'Settings', subtitle: 'System thresholds, alert preferences & demo reset' };
    if (currentPath === '/admin/activity') return { title: 'Activity Log', subtitle: 'Audit log of automated EV dispatches and admin actions' };
    return { title: 'Admin Dashboard', subtitle: 'Municipal Smart Waste Management Operations Center' };
  };

  const aHeader = getAdminHeader();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex">
      <ToastContainer />
      <AdminSidebar mobileOpen={mobileSidebarOpen} setMobileOpen={setMobileSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        <Header 
          title={aHeader.title} 
          subtitle={aHeader.subtitle} 
          setMobileOpen={setMobileSidebarOpen}
          onOpenSimModal={() => setHardwareSimModalOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24">
          {(currentPath === '/' || currentPath === '/admin' || currentPath === '/admin/dashboard' || currentPath === '/dashboard') && (
            <DashboardPage onOpenSimModal={() => setHardwareSimModalOpen(true)} />
          )}

          {(currentPath === '/admin/bins' || currentPath === '/bins') && (
            <BinMonitoringPage />
          )}

          {(currentPath.startsWith('/admin/bins/') || currentPath.startsWith('/bins/')) && (
            <BinDetailsPage 
              binCode={params.binCode || bins[0]?.binCode || 'BIN-001'} 
              onOpenSimModal={() => setHardwareSimModalOpen(true)}
            />
          )}

          {(currentPath === '/admin/complaints' || currentPath === '/complaints') && (
            <ComplaintsPage />
          )}

          {(currentPath === '/admin/qr' || currentPath === '/qr-management') && (
            <QRManagementPage />
          )}

          {(currentPath === '/admin/analytics' || currentPath === '/analytics') && (
            <AnalyticsPage />
          )}

          {(currentPath === '/admin/planner' || currentPath === '/planner') && (
            <PlannerPage />
          )}

          {currentPath === '/admin/ev' && (
            <EVFleetPage />
          )}

          {(currentPath === '/admin/feedback' || currentPath === '/feedback') && (
            <FeedbackPage />
          )}

          {(currentPath === '/admin/settings' || currentPath === '/settings') && (
            <SettingsPage />
          )}

          {currentPath === '/admin/activity' && (
            <ActivityLogPage />
          )}
        </main>
      </div>

      <HardwareSimWidget 
        isOpen={hardwareSimModalOpen} 
        onClose={() => setHardwareSimModalOpen(false)} 
      />

      <DemoToolbar onOpenSimModal={() => setHardwareSimModalOpen(true)} />
    </div>
  );
};
