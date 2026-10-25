import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import api from '../api';
// Single source of truth for stages/SLA/alert levels: lib/metrics.ts
import { getStage, getDaysLeft, alertLevel } from '../lib/metrics';
export {
  ROUTES,
  DEFAULT_SLA,
  getStage,
  getDaysLeft,
  alertLevel,
  formatDays,
} from '../lib/metrics';
import type {
  Theme,
  NavPage,
  AppRecord,
  UndertakingRecord,
  DocumentRecord,
  LogRecord,
  UrgencyItem,
  AphRulesConfig,
} from '../types';

export const STATUS_LABELS = ['Pending', 'Submitted', 'Verified'];

/** Filter payload used for deep-links from Overview cards/rows to Applications. */
export interface AppsLinkFilter {
  region?: string;
  stage?: string;
  route?: string;
  overdueOnly?: boolean;
}

// ── Mock data ────────────────────────────────────────────────────────────────
const INITIAL_A: AppRecord[] = [
  { id: 'A-2611', inst: 'Nandi Institute of Technology',      reg: 'South', rt: 'SE',  i: 1, age: 24, evc: 6  },
  { id: 'A-2612', inst: 'Rajmata College of Engineering',     reg: 'West',  rt: 'S',   i: 0, age: 17, evc: 0  },
  { id: 'A-2613', inst: 'Himalaya Polytechnic',               reg: 'North', rt: 'ES',  i: 0, age: 9,  evc: 12 },
  { id: 'A-2614', inst: 'Kaveri School of Management',        reg: 'South', rt: 'SES', i: 2, age: 22, evc: 0  },
  { id: 'A-2615', inst: 'Gangetic Institute of Pharmacy',     reg: 'East',  rt: 'SE',  i: 0, age: 6,  evc: 0  },
  { id: 'A-2616', inst: 'Thar Technical Campus',              reg: 'North', rt: 'E',   i: 0, age: 34, evc: -4 },
  { id: 'A-2617', inst: 'Konkan Architecture Institute',      reg: 'West',  rt: 'SE',  i: 1, age: 12, evc: 18 },
  { id: 'A-2618', inst: 'Brahmaputra Engineering College',    reg: 'East',  rt: 'ES',  i: 1, age: 5,  evc: 0  },
  { id: 'A-2619', inst: 'Deccan Institute of Computing',      reg: 'South', rt: 'S',   i: 0, age: 14, evc: 0  },
  { id: 'A-2620', inst: 'Malwa Polytechnic',                  reg: 'West',  rt: 'E',   i: 0, age: 18, evc: 26 },
  { id: 'A-2621', inst: 'Sundarban Tech University',          reg: 'East',  rt: 'SES', i: 1, age: 27, evc: -9 },
  { id: 'A-2622', inst: 'Punjab Institute of Design',         reg: 'North', rt: 'SE',  i: 0, age: 3,  evc: 0  },
];

const INITIAL_U: UndertakingRecord[] = [
  { id: 1, inst: 'Nandi Institute of Technology',   reg: 'South', t: 'Complete fire-safety NOC',      d: -12, s: 0 },
  { id: 2, inst: 'Himalaya Polytechnic',            reg: 'North', t: 'Appoint 4 faculty members',     d: 9,   s: 0 },
  { id: 3, inst: 'Konkan Architecture Institute',   reg: 'West',  t: 'Library accreditation proof',   d: 22,  s: 1 },
  { id: 4, inst: 'Sundarban Tech University',       reg: 'East',  t: 'Laboratory equipment evidence', d: -3,  s: 1 },
  { id: 5, inst: 'Malwa Polytechnic',               reg: 'West',  t: 'Playground land mutation',      d: 41,  s: 0 },
  { id: 6, inst: 'Deccan Institute of Computing',   reg: 'South', t: 'Deposit corpus fund',           d: 14,  s: 0 },
];

const INITIAL_D: DocumentRecord[] = [
  { id: 1, inst: 'Rajmata College of Engineering',   reg: 'West',  t: 'Campus lease deed',   d: -5,  s: 0 },
  { id: 2, inst: 'Thar Technical Campus',            reg: 'North', t: 'Campus lease deed',   d: 12,  s: 0 },
  { id: 3, inst: 'Gangetic Institute of Pharmacy',   reg: 'East',  t: 'Hostel lease',         d: 58,  s: 0 },
  { id: 4, inst: 'Kaveri School of Management',      reg: 'South', t: 'Campus lease deed',   d: 6,   s: 1 },
  { id: 5, inst: 'Punjab Institute of Design',       reg: 'North', t: 'Lease registration',  d: -22, s: 0 },
  { id: 6, inst: 'Brahmaputra Engineering College',  reg: 'East',  t: 'Campus lease deed',   d: 140, s: 0 },
];

const INITIAL_LOG: LogRecord[] = [
  { t: '25 Oct 2026 · 09:00', who: 'System', x: 'Nightly deadline scan completed for all regions' },
];

// ── Context types ────────────────────────────────────────────────────────────
interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warn' | 'info' | 'error';
}

interface AppContextValue {
  // Theme
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;

  // Role & navigation
  role: string;
  setRole: (r: string) => void;
  page: NavPage;
  setPage: (p: NavPage) => void;

  // Live mode
  isLive: boolean;

  // Data
  A: AppRecord[];
  U: UndertakingRecord[];
  D: DocumentRecord[];
  LOG: LogRecord[];
  aphRules: AphRulesConfig;

  // Derived / filtered by role
  apps: AppRecord[];
  evcs: AppRecord[];
  ul: UndertakingRecord[];
  dl: DocumentRecord[];
  urgencyItems: UrgencyItem[];

  // APH modal
  isAphModalOpen: boolean;
  setIsAphModalOpen: (v: boolean) => void;

  // Toasts
  toasts: ToastItem[];
  showToast: (title: string, message: string, type?: ToastItem['type']) => void;
  dismissToast: (id: string) => void;

  // Actions
  actionLoading: string | null;
  handleAdvance: (appId: string) => Promise<void>;
  handleReturn: (appId: string, reason: string) => Promise<void>;
  handleUndertakingAction: (idx: number, uItem: UndertakingRecord) => Promise<void>;
  handleDocumentAction: (idx: number, dItem: DocumentRecord) => Promise<void>;
  handleSweep: () => Promise<void>;
  handleSaveAphRules: (rules: AphRulesConfig) => Promise<void>;
  handleExportCsv: () => Promise<void>;

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Cross-page links (Overview → Applications filtered / drawer)
  dataReady: boolean;
  pendingAppsFilter: AppsLinkFilter | null;
  setPendingAppsFilter: (f: AppsLinkFilter | null) => void;
  pendingDrawerAppId: string | null;
  setPendingDrawerAppId: (id: string | null) => void;

  // Helpers
  getDaysLeftForApp: (a: AppRecord) => number;
  roleName: string;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  // ── Theme ──────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('aicte-theme');
    if (stored === 'dark' || stored === 'light') return stored;
    // First load: respect the system preference
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('aicte-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  // ── Role & Page ────────────────────────────────────────────────────────────
  const [role, setRole] = useState('Bureau');
  const [page, setPage] = useState<NavPage>('ov');

  // ── Live mode ──────────────────────────────────────────────────────────────
  const [isLive, setIsLive] = useState(false);

  // ── Data readiness (drives skeleton loaders) ───────────────────────────────
  const [dataReady, setDataReady] = useState(false);

  // ── Deep-links: filters / drawer target carried from other pages ───────────
  const [pendingAppsFilter, setPendingAppsFilter] = useState<AppsLinkFilter | null>(null);
  const [pendingDrawerAppId, setPendingDrawerAppId] = useState<string | null>(null);

  // ── Data ───────────────────────────────────────────────────────────────────
  const [A, setA] = useState<AppRecord[]>(INITIAL_A);
  const [U, setU] = useState<UndertakingRecord[]>(INITIAL_U);
  const [D, setD] = useState<DocumentRecord[]>(INITIAL_D);
  const [LOG, setLOG] = useState<LogRecord[]>(INITIAL_LOG);
  const [aphRules, setAphRules] = useState<AphRulesConfig>({ Scrutiny: 15, EVC: 30, 'SAC/SHC': 20 });

  // ── APH modal ──────────────────────────────────────────────────────────────
  const [isAphModalOpen, setIsAphModalOpen] = useState(false);

  // ── Action loading ─────────────────────────────────────────────────────────
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ── Search ─────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');

  // ── Toast ──────────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const showToast = useCallback((
    title: string,
    message: string,
    type: ToastItem['type'] = 'success',
  ) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);
  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── Role name ──────────────────────────────────────────────────────────────
  const roleName = useMemo(() => {
    switch (role) {
      case 'Bureau':    return 'Bureau officer';
      case 'South':     return 'Regional · South';
      case 'North':     return 'Regional · North';
      case 'West':      return 'Regional · West';
      case 'East':      return 'Regional · East';
      case 'Committee': return 'Committee (EVC / SAC)';
      default:          return role;
    }
  }, [role]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getDaysLeftForApp = useCallback((a: AppRecord) => getDaysLeft(a, aphRules), [aphRules]);

  // ── RBAC filtering ─────────────────────────────────────────────────────────
  const apps = useMemo(() => A.filter(a => {
    const s = getStage(a);
    if (s === null) return false;
    if (role === 'Bureau') return true;
    if (role === 'Committee') return s === 'EVC' || s === 'SAC/SHC';
    return a.reg === role;
  }), [A, role]);

  const evcs = useMemo(() => apps.filter(a => getStage(a) === 'EVC'), [apps]);

  const ul = useMemo(() => U.filter(u => {
    if (role === 'Bureau') return true;
    if (role === 'Committee') return u.s < 2;
    return u.reg === role;
  }), [U, role]);

  const dl = useMemo(() => D.filter(d => {
    if (role === 'Bureau') return true;
    if (role === 'Committee') return d.s < 2;
    return d.reg === role;
  }), [D, role]);

  // ── Urgency items ──────────────────────────────────────────────────────────
  const urgencyItems = useMemo<UrgencyItem[]>(() => {
    const items: UrgencyItem[] = [];
    apps.forEach(a => {
      const d = getDaysLeftForApp(a);
      items.push({ kind: 'Stage', stage: getStage(a) ?? undefined, inst: a.inst, reg: a.reg, d, appId: a.id });
    });
    evcs.forEach(a => {
      items.push({ kind: 'EVC', inst: a.inst, reg: a.reg, d: a.evc, appId: a.id });
    });
    ul.forEach(u => {
      if (u.s < 2) items.push({ kind: 'Undertaking', inst: u.inst, reg: u.reg, d: u.d, recordId: u.id });
    });
    dl.forEach(doc => {
      if (doc.s < 2) items.push({ kind: 'Document', inst: doc.inst, reg: doc.reg, d: doc.d, recordId: doc.id });
    });
    return items.sort((a, b) => a.d - b.d);
  }, [apps, evcs, ul, dl, getDaysLeftForApp]);

  // ── Load live data ─────────────────────────────────────────────────────────
  const loadLiveData = useCallback(async () => {
    try {
      const healthy = await api.checkHealth();
      setIsLive(healthy);
      if (!healthy) return;

      const [backendApps, backendUndertakings, backendDocs, backendLogs, backendRules] =
        await Promise.all([
          api.getApplications({ role }),
          api.getUndertakings({ role }),
          api.getLeasesAndDocuments({ role }),
          api.getAuditLogs(),
          api.getAphRules().catch(() => null),
        ]);

      setA(backendApps.map((a: any) => ({
        id:   a.id,
        inst: a.institution?.name || a.institution_id,
        reg:  a.institution?.region || '',
        rt:   a.route_type,
        i:    a.current_stage_index,
        age:  a.age_in_days,
        evc:  a.evc_timeline_status,
      })));

      setU(backendUndertakings.map((u: any) => ({
        id:   u.id,
        inst: u.institution?.name || u.institution_id,
        reg:  u.institution?.region || '',
        t:    u.condition_text,
        d:    u.due_days,
        s:    u.status,
      })));

      setD(backendDocs.map((d: any) => ({
        id:   d.id,
        inst: d.institution?.name || d.institution_id,
        reg:  d.institution?.region || '',
        t:    d.document_type,
        d:    d.expiry_days,
        s:    d.status,
      })));

      setLOG(backendLogs.map((l: any) => ({
        t:   l.timestamp,
        who: l.actor,
        x:   l.event_description,
      })));

      if (backendRules) setAphRules(backendRules);
    } catch (err) {
      console.warn('Backend unavailable, using mock data:', err);
      setIsLive(false);
    } finally {
      setDataReady(true);
    }
  }, [role]);

  const loadRef = useRef(loadLiveData);
  loadRef.current = loadLiveData;

  useEffect(() => { loadRef.current(); }, [role]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleAdvance = useCallback(async (appId: string) => {
    setActionLoading(`adv-${appId}`);
    const target = A.find(x => x.id === appId);
    const prevStage = target ? (getStage(target) ?? 'Stage') : 'Stage';
    try {
      if (isLive) {
        await api.advanceApplication(appId, roleName);
        await loadRef.current();
      } else {
        if (target) {
          target.i++;
          target.age = 0;
          const nextStage = getStage(target);
          const desc = `${target.id}: ${prevStage} completed → ${nextStage ? `moved to ${nextStage}` : 'forwarded to competent authority'}`;
          setLOG(prev => [{ t: new Date().toLocaleString(), who: roleName, x: desc }, ...prev]);
          setA([...A]);
        }
      }
      showToast('Stage Completed', `${appId} advanced from ${prevStage}`, 'success');
    } catch (err: any) {
      showToast('Advance Failed', err?.message || 'Action failed', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [A, isLive, roleName, showToast]);

  const handleReturn = useCallback(async (appId: string, reason: string) => {
    setActionLoading(`ret-${appId}`);
    try {
      if (isLive) {
        await api.revertApplication(appId, reason, roleName);
        await loadRef.current();
      } else {
        const o = A.find(x => x.id === appId);
        if (o) {
          o.i = Math.max(0, o.i - 1);
          o.age = 0;
          const desc = `${o.id}: returned to ${getStage(o)} · reason: ${reason}`;
          setLOG(prev => [{ t: new Date().toLocaleString(), who: roleName, x: desc }, ...prev]);
          setA([...A]);
        }
      }
      showToast('Application Returned', `${appId} returned — ${reason}`, 'warn');
    } catch (err: any) {
      showToast('Return Failed', err?.message || 'Action failed', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [A, isLive, roleName, showToast]);

  const handleUndertakingAction = useCallback(async (idx: number, uItem: UndertakingRecord) => {
    setActionLoading(`un-${idx}`);
    const isUpload = uItem.s === 0;
    try {
      if (isLive && uItem.id) {
        if (isUpload) await api.uploadUndertaking(uItem.id, roleName);
        else           await api.verifyUndertaking(uItem.id, roleName);
        await loadRef.current();
      } else {
        const o = U[idx];
        if (o) {
          o.s++;
          const desc = `${o.inst}: ${o.t} ${o.s === 1 ? 'submitted' : 'verified'}`;
          setLOG(prev => [{ t: new Date().toLocaleString(), who: roleName, x: desc }, ...prev]);
          setU([...U]);
        }
      }
      showToast(
        isUpload ? 'Evidence Uploaded' : 'Undertaking Verified',
        `${uItem.inst}: ${uItem.t}`,
        'success',
      );
    } catch (err: any) {
      showToast('Action Failed', err?.message || 'Could not process undertaking', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [U, isLive, roleName, showToast]);

  const handleDocumentAction = useCallback(async (idx: number, dItem: DocumentRecord) => {
    setActionLoading(`dc-${idx}`);
    const isUpload = dItem.s === 0;
    try {
      if (isLive && dItem.id) {
        if (isUpload) await api.uploadDocument(dItem.id, roleName);
        else           await api.verifyDocument(dItem.id, roleName);
        await loadRef.current();
      } else {
        const o = D[idx];
        if (o) {
          o.s++;
          if (o.s === 2) o.d = 365;
          const desc = `${o.inst}: ${o.t} ${o.s === 1 ? 'submitted' : 'verified (+365d)'}`;
          setLOG(prev => [{ t: new Date().toLocaleString(), who: roleName, x: desc }, ...prev]);
          setD([...D]);
        }
      }
      showToast(
        isUpload ? 'Document Uploaded' : 'Document Verified & Renewed',
        `${dItem.inst}: ${dItem.t}${!isUpload ? ' (+365 days)' : ''}`,
        'success',
      );
    } catch (err: any) {
      showToast('Action Failed', err?.message || 'Could not process document', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [D, isLive, roleName, showToast]);

  const handleSweep = useCallback(async () => {
    setActionLoading('sweep');
    try {
      if (isLive) {
        const res = await api.runAlertSweep(roleName);
        await loadRef.current();
        showToast('Alert Sweep Completed', `${res.alerts_count || 0} notifications dispatched`, 'info');
      } else {
        const urgent = urgencyItems.filter(x => x.d <= 15);
        const newLogs = urgent.map(x => ({
          t:   new Date().toLocaleString(),
          who: roleName,
          x:   `${alertLevel(x.d)} sent: ${x.kind} · ${x.inst}`,
        }));
        setLOG(prev => [...newLogs, ...prev]);
        showToast('Alert Sweep Completed', `${urgent.length} notifications processed`, 'info');
      }
    } catch (err: any) {
      showToast('Sweep Failed', err?.message || 'Error running alert sweep', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [isLive, roleName, urgencyItems, showToast]);

  const handleSaveAphRules = useCallback(async (rules: AphRulesConfig) => {
    try {
      if (isLive) {
        const updated = await api.updateAphRules(rules, roleName);
        setAphRules(updated);
        await loadRef.current();
      } else {
        setAphRules(rules);
      }
      showToast('APH Rules Saved', `Scrutiny ${rules.Scrutiny}d · EVC ${rules.EVC}d · SAC/SHC ${rules['SAC/SHC']}d`, 'success');
    } catch (err: any) {
      showToast('Save Failed', err?.message || 'Could not update APH rules', 'error');
      throw err;
    }
  }, [isLive, roleName, showToast]);

  const handleExportCsv = useCallback(async () => {
    setActionLoading('export-csv');
    try {
      const region = role !== 'Bureau' && role !== 'Committee' ? role : undefined;
      await api.downloadPendencyReportCsv(role, region);
      showToast('Report Exported', 'Pendency CSV downloaded', 'success');
    } catch (err: any) {
      showToast('Export Failed', err?.message || 'Could not download CSV', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [role, showToast]);

  const value: AppContextValue = {
    theme, setTheme, toggleTheme,
    role, setRole,
    page, setPage,
    isLive,
    A, U, D, LOG, aphRules,
    apps, evcs, ul, dl, urgencyItems,
    isAphModalOpen, setIsAphModalOpen,
    toasts, showToast, dismissToast,
    actionLoading,
    handleAdvance, handleReturn,
    handleUndertakingAction, handleDocumentAction,
    handleSweep, handleSaveAphRules, handleExportCsv,
    searchQuery, setSearchQuery,
    getDaysLeftForApp,
    roleName,
    dataReady,
    pendingAppsFilter, setPendingAppsFilter,
    pendingDrawerAppId, setPendingDrawerAppId,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
