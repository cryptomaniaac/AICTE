import { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './layout/Sidebar';
import { TopBar } from './layout/TopBar';
import { OverviewPage } from './pages/OverviewPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { EVCQueuePage } from './pages/EVCQueuePage';
import { UndertakingsPage } from './pages/UndertakingsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { EscalationsPage } from './pages/EscalationsPage';
import { AuditTrailPage } from './pages/AuditTrailPage';
import { AphRulesModal } from './components/AphRulesModal';
import { ToastContainer } from './components/Toast';

function AppShell() {
  const {
    page,
    toasts, dismissToast,
    isAphModalOpen, setIsAphModalOpen,
    aphRules, handleSaveAphRules, role,
  } = useApp();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [safeguardDismissed, setSafeguardDismissed] = useState(
    () => sessionStorage.getItem('safeguard-dismissed') === '1'
  );

  const dismissSafeguard = () => {
    setSafeguardDismissed(true);
    sessionStorage.setItem('safeguard-dismissed', '1');
  };

  const renderPage = () => {
    switch (page) {
      case 'ov':  return <OverviewPage />;
      case 'ap':  return <ApplicationsPage />;
      case 'evc': return <EVCQueuePage />;
      case 'un':  return <UndertakingsPage />;
      case 'dc':  return <DocumentsPage />;
      case 'es':  return <EscalationsPage />;
      case 'lg':  return <AuditTrailPage />;
      default:    return <OverviewPage />;
    }
  };

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main area */}
      <div className="main-area">
        {/* Top bar + safeguard banner */}
        <TopBar
          safeguardDismissed={safeguardDismissed}
          onDismissSafeguard={dismissSafeguard}
          onOpenMenu={() => setMobileOpen(true)}
        />

        {/* Page content */}
        <main className="page-scroll" id="main-content" tabIndex={-1}>
          {renderPage()}
        </main>
      </div>

      {/* APH Rules Modal */}
      <AphRulesModal
        isOpen={isAphModalOpen}
        onClose={() => setIsAphModalOpen(false)}
        currentRules={aphRules}
        onSave={handleSaveAphRules}
        role={role}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

export default App;
