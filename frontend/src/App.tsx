import { useState, useEffect, useRef } from 'react';
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
import {
  AphRulesModal,
  ToastContainer,
  CommandPalette,
  GuidedTour,
  ShortcutsModal,
  SettingsModal,
  HelpCenterModal,
} from './components';
import { useRoute } from './router';
import { LandingPage } from './landing/LandingPage';

/** Sync reduced-motion preference to document root attribute */
function useReducedMotion() {
  const [reduced, setReduced] = useState<boolean>(() => {
    try { return localStorage.getItem('aicte-reduced-motion') === '1'; } catch { return false; }
  });
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sys = mq.matches;
    const stored = reduced;
    const active = stored || sys;
    document.documentElement.dataset.reducedMotion = active ? '1' : '0';
  }, [reduced]);
  const toggle = () => {
    setReduced(v => {
      const next = !v;
      try { localStorage.setItem('aicte-reduced-motion', next ? '1' : '0'); } catch { /* */ }
      return next;
    });
  };
  return { reduced, toggle };
}

function AppShell() {
  const {
    page, setPage,
    toasts, dismissToast,
    isAphModalOpen, setIsAphModalOpen,
    aphRules, handleSaveAphRules, role,
  } = useApp();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [safeguardDismissed, setSafeguardDismissed] = useState(
    () => sessionStorage.getItem('safeguard-dismissed') === '1'
  );
  const [cmdOpen, setCmdOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpCenterOpen, setHelpCenterOpen] = useState(false);
  const { reduced, toggle: toggleMotion } = useReducedMotion();

  // Page-transition key so the wrapper re-mounts on navigation
  const [pageKey, setPageKey] = useState(page);
  const prevPage = useRef(page);
  useEffect(() => {
    if (page !== prevPage.current) {
      prevPage.current = page;
      setPageKey(page);
    }
  }, [page]);

  // Global keyboard shortcuts (Cmd+K, ?, G sequence)
  const gSequenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gPressedRef = useRef(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(o => !o);
        return;
      }

      if (isInput) return;

      if (e.key === '?') {
        e.preventDefault();
        setShortcutsOpen(o => !o);
        return;
      }

      if (e.key === 'g' || e.key === 'G') {
        gPressedRef.current = true;
        if (gSequenceTimer.current) clearTimeout(gSequenceTimer.current);
        gSequenceTimer.current = setTimeout(() => {
          gPressedRef.current = false;
        }, 800);
        return;
      }

      if (gPressedRef.current) {
        gPressedRef.current = false;
        if (e.key === 'd' || e.key === 'D') { setPage('ov'); }
        else if (e.key === 'a' || e.key === 'A') { setPage('ap'); }
        else if (e.key === 'e' || e.key === 'E') { setPage('evc'); }
        else if (e.key === 's' || e.key === 'S') { setPage('es'); }
        else if (e.key === 'l' || e.key === 'L') { setPage('lg'); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setPage]);

  // Check if first-time user for guided tour or triggered from landing page
  useEffect(() => {
    try {
      const trigger = localStorage.getItem('aicte_trigger_tour');
      const seen = localStorage.getItem('aicte_tour_seen');
      if (trigger === '1' || !seen) {
        if (trigger === '1') {
          localStorage.removeItem('aicte_trigger_tour');
        }
        const timer = setTimeout(() => setTourOpen(true), 1000);
        return () => clearTimeout(timer);
      }
    } catch {
      /* ignore */
    }
  }, []);

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
      {/* aria-live for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        id="aria-announcer"
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}
      />

      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        reducedMotion={reduced}
        onToggleMotion={toggleMotion}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenHelpCenter={() => setHelpCenterOpen(true)}
      />

      {/* Main area */}
      <div className="main-area">
        {/* Top bar + safeguard banner */}
        <TopBar
          safeguardDismissed={safeguardDismissed}
          onDismissSafeguard={dismissSafeguard}
          onOpenMenu={() => setMobileOpen(true)}
          onOpenCmd={() => setCmdOpen(true)}
          onOpenTour={() => { setPage('ov'); setTourOpen(true); }}
        />

        {/* Page content — key changes trigger fade+slide-up */}
        <main className="page-scroll" id="main-content" tabIndex={-1}>
          <div key={pageKey} className="page-enter">
            {renderPage()}
          </div>
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

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        reducedMotion={reduced}
        onToggleMotion={toggleMotion}
        onOpenAphRules={() => setIsAphModalOpen(true)}
        onOpenTour={() => { setPage('ov'); setTourOpen(true); }}
      />

      {/* Help Center Modal */}
      <HelpCenterModal
        isOpen={helpCenterOpen}
        onClose={() => setHelpCenterOpen(false)}
        onOpenTour={() => { setPage('ov'); setTourOpen(true); }}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        onOpenAphRules={() => setIsAphModalOpen(true)}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Command palette */}
      {cmdOpen && (
        <CommandPalette
          onClose={() => setCmdOpen(false)}
          onOpenTour={() => setTourOpen(true)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
          onToggleReducedMotion={toggleMotion}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenHelpCenter={() => setHelpCenterOpen(true)}
        />
      )}

      {/* Guided Tour */}
      <GuidedTour isOpen={tourOpen} onClose={() => setTourOpen(false)} />

      {/* Keyboard Shortcuts Sheet */}
      <ShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}

function RootRouter() {
  const route = useRoute();

  if (!route.isApp) {
    return <LandingPage activeTab={route.landingTab} />;
  }

  return <AppShell />;
}

export function App() {
  return (
    <AppProvider>
      <RootRouter />
    </AppProvider>
  );
}

export default App;
