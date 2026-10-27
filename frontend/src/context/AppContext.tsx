import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import api, { type ApplicantProfile } from '../api';
// Single source of truth for stages/SLA/alert levels: lib/metrics.ts
import { ROUTES, DEFAULT_SLA, getStage, getDaysLeft, alertLevel, formatDays } from '../lib/metrics';
import { getSimulatedDate, formatDemoDate } from '../lib/clock';
import { parseRoute, appPageToPath, navigateTo } from '../router';

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

export { ROUTES, DEFAULT_SLA, getStage, getDaysLeft, alertLevel, formatDays };

export const STATUS_LABELS = ['Pending', 'Submitted', 'Verified'];

export interface LiveEventSummary {
  id: string;
  type: 'app_new' | 'stage_adv' | 'doc_upload' | 'sla_warning' | 'evc_clear' | 'general';
  title: string;
  desc: string;
  timestamp: string;
  appId?: string;
  recordId?: string;
  inst?: string;
}

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

interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warn' | 'info' | 'error';
  duration?: number;
  undoLabel?: string;
  onUndo?: () => void;
}

export function announceToAria(text: string) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('aria-announcer');
  if (el) {
    el.textContent = '';
    setTimeout(() => { if (el) el.textContent = text; }, 40);
  }
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

  // Live mode & simulation
  isLive: boolean;
  simulationActive: boolean;
  setSimulationActive: React.Dispatch<React.SetStateAction<boolean>>;
  triggerSimulatedEvent: () => void;
  lastUpdatedTimestamp: number;
  bellUnreadCount: number;
  clearBellCount: () => void;
  recentlyUpdatedId: string | null;
  setRecentlyUpdatedId: (id: string | null) => void;
  latestLiveEvent: LiveEventSummary | null;
  setLatestLiveEvent: (e: LiveEventSummary | null) => void;

  // Time Travel
  timeTravelDays: number;
  setTimeTravelDays: (days: number) => void;
  resetDemoData: () => void;

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
  showToast: (
    title: string,
    message: string,
    type?: ToastItem['type'],
    options?: { duration?: number; undoLabel?: string; onUndo?: () => void },
  ) => void;
  dismissToast: (id: string) => void;

  // Actions
  actionLoading: string | null;
  handleAdvance: (appId: string) => Promise<void>;
  handleReturn: (appId: string, reason: string) => Promise<void>;
  handleUndertakingAction: (idx: number, uItem: UndertakingRecord) => Promise<void>;
  handleDocumentAction: (idx: number, dItem: DocumentRecord) => Promise<void>;
  handleRescheduleEVC: (appId: string, newDays: number) => void;
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

  // User Authentication & Profile
  currentUser: ApplicantProfile | null;
  setCurrentUser: (user: ApplicantProfile | null) => void;
  logoutUser: () => void;
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
    try {
      const stored = localStorage.getItem('aicte-theme');
      if (stored === 'dark' || stored === 'light') return stored;
    } catch {
      /* ignore */
    }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('aicte-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  // ── Role, User & Page (Router integrated) ──────────────────────────────────
  const initialRoute = parseRoute(
    typeof window !== 'undefined' ? window.location.pathname : '/',
    typeof window !== 'undefined' ? window.location.hash : ''
  );

  const [currentUser, setCurrentUserState] = useState<ApplicantProfile | null>(() => {
    try {
      const stored = localStorage.getItem('aicte_current_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [role, setRole] = useState(() => {
    try {
      const storedUser = localStorage.getItem('aicte_current_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed.role) return parsed.role;
        if (parsed.region) return parsed.region;
      }
    } catch {
      /* ignore */
    }
    return 'Bureau';
  });

  const [page, setPageState] = useState<NavPage>(initialRoute.appPage);


  const setPage = useCallback((p: NavPage | ((prev: NavPage) => NavPage)) => {
    setPageState(prev => {
      const next = typeof p === 'function' ? p(prev) : p;
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/app')) {
        const nextPath = appPageToPath(next);
        if (window.location.pathname !== nextPath) {
          window.history.pushState({}, '', nextPath + (window.location.hash || ''));
          window.dispatchEvent(new Event('popstate'));
        }
      }
      return next;
    });
  }, []);

  // ── Live mode ──────────────────────────────────────────────────────────────
  const [isLive, setIsLive] = useState(false);

  // ── Data readiness (drives skeleton loaders) ───────────────────────────────
  const [dataReady, setDataReady] = useState(false);

  // ── Deep-links: filters / drawer target carried from other pages ───────────
  const [pendingAppsFilter, setPendingAppsFilter] = useState<AppsLinkFilter | null>(null);
  const [pendingDrawerAppId, setPendingDrawerAppIdState] = useState<string | null>(initialRoute.hashItem);

  const setPendingDrawerAppId = useCallback((id: string | null) => {
    setPendingDrawerAppIdState(id);
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/app')) {
      if (id) {
        window.history.replaceState({}, '', `${window.location.pathname}#/item/${encodeURIComponent(id)}`);
      } else if (window.location.hash.startsWith('#/item/')) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  useEffect(() => {
    const handlePop = () => {
      const parsed = parseRoute(window.location.pathname, window.location.hash);
      if (parsed.isApp) {
        setPageState(parsed.appPage);
        if (parsed.hashItem) {
          setPendingDrawerAppIdState(parsed.hashItem);
        }
      }
    };
    window.addEventListener('popstate', handlePop);
    window.addEventListener('hashchange', handlePop);
    return () => {
      window.removeEventListener('popstate', handlePop);
      window.removeEventListener('hashchange', handlePop);
    };
  }, []);

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
    options?: { duration?: number; undoLabel?: string; onUndo?: () => void },
  ) => {
    const id = Math.random().toString(36).slice(2);
    const dur = options?.duration ?? 4500;
    announceToAria(`${title}: ${message}`);
    setToasts(prev => [...prev, { id, title, message, type, ...options }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), dur);
  }, []);
  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── Time travel & Live simulation ──────────────────────────────────────────
  const [timeTravelDays, setTimeTravelDaysState] = useState(0);
  const [simulationActive, setSimulationActive] = useState(false);
  const [latestLiveEvent, setLatestLiveEvent] = useState<LiveEventSummary | null>(null);
  const [lastUpdatedTimestamp, setLastUpdatedTimestamp] = useState(() => Date.now());
  const [bellUnreadCount, setBellUnreadCount] = useState(0);
  const clearBellCount = useCallback(() => setBellUnreadCount(0), []);
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState<string | null>(null);

  // ── User Authentication Callbacks ──────────────────────────────────────────
  const setCurrentUser = useCallback((user: ApplicantProfile | null) => {
    setCurrentUserState(user);
    try {
      if (user) {
        localStorage.setItem('aicte_current_user', JSON.stringify(user));
        if (user.role && user.role !== 'Institution') {
          setRole(user.role);
        } else if (user.region) {
          setRole(user.region);
        }
        if (user.application_id && user.institution_name) {
          setA(prev => {
            if (prev.some(a => a.id === user.application_id || a.inst.toLowerCase() === user.institution_name.toLowerCase())) {
              return prev;
            }
            const newApp: AppRecord = {
              id: user.application_id!,
              inst: user.institution_name,
              reg: user.region,
              rt: user.route_type || 'SES',
              i: 0,
              age: 1,
              evc: user.route_type.includes('E') ? 14 : 0,
            };
            return [newApp, ...prev];
          });
          setLOG(prev => [{
            t: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            who: user.name,
            x: `Applicant Onboarded: ${user.name} · ${user.institution_name} (${user.region})`,
          }, ...prev]);
        }
      } else {
        localStorage.removeItem('aicte_current_user');
      }
    } catch {
      /* ignore */
    }
  }, []);

  const logoutUser = useCallback(() => {
    setCurrentUserState(null);
    try {
      localStorage.removeItem('aicte_current_user');
    } catch {
      /* ignore */
    }
    setRole('Bureau');
    showToast('Signed Out', 'You have been signed out safely.', 'info');
    navigateTo('/', { transition: true });
  }, [showToast]);

  // ── Role name ──────────────────────────────────────────────────────────────
  const roleName = useMemo(() => {
    switch (role) {
      case 'Bureau':      return 'Bureau officer';
      case 'South':       return 'Regional · South';
      case 'North':       return 'Regional · North';
      case 'West':        return 'Regional · West';
      case 'East':        return 'Regional · East';
      case 'Committee':   return 'Committee (EVC / SAC)';
      case 'Applicant':
      case 'Institution': return currentUser ? `${currentUser.name} (${currentUser.institution_name})` : 'Applicant / Institution';
      default:            return role;
    }
  }, [role, currentUser]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getDaysLeftForApp = useCallback((a: AppRecord) => {
    return getDaysLeft(a, aphRules) - timeTravelDays;
  }, [aphRules, timeTravelDays]);

  // ── RBAC filtering ─────────────────────────────────────────────────────────
  const apps = useMemo(() => A.filter(a => {
    const s = getStage(a);
    if (s === null) return false;
    if (role === 'Bureau') return true;
    if (role === 'Committee') return s === 'EVC' || s === 'SAC/SHC';
    if (role === 'Applicant' || role === 'Institution') {
      if (currentUser?.institution_name) {
        return a.inst.toLowerCase().includes(currentUser.institution_name.toLowerCase()) || a.reg === currentUser.region;
      }
      return true;
    }
    return a.reg === role;
  }), [A, role, currentUser]);

  const evcs = useMemo(() => apps.filter(a => getStage(a) === 'EVC'), [apps]);

  const ul = useMemo(() => U.filter(u => {
    if (role === 'Bureau') return true;
    if (role === 'Committee') return u.s < 2;
    if (role === 'Applicant' || role === 'Institution') {
      if (currentUser?.institution_name) {
        return u.inst.toLowerCase().includes(currentUser.institution_name.toLowerCase()) || u.reg === currentUser.region;
      }
      return true;
    }
    return u.reg === role;
  }), [U, role, currentUser]);

  const dl = useMemo(() => D.filter(d => {
    if (role === 'Bureau') return true;
    if (role === 'Committee') return d.s < 2;
    if (role === 'Applicant' || role === 'Institution') {
      if (currentUser?.institution_name) {
        return d.inst.toLowerCase().includes(currentUser.institution_name.toLowerCase()) || d.reg === currentUser.region;
      }
      return true;
    }
    return d.reg === role;
  }), [D, role, currentUser]);


  // ── Urgency items ──────────────────────────────────────────────────────────
  const urgencyItems = useMemo<UrgencyItem[]>(() => {
    const items: UrgencyItem[] = [];
    apps.forEach(a => {
      const d = getDaysLeftForApp(a);
      items.push({ kind: 'Stage', stage: getStage(a) ?? undefined, inst: a.inst, reg: a.reg, d, appId: a.id });
    });
    evcs.forEach(a => {
      items.push({ kind: 'EVC', inst: a.inst, reg: a.reg, d: a.evc - timeTravelDays, appId: a.id });
    });
    ul.forEach(u => {
      if (u.s < 2) items.push({ kind: 'Undertaking', inst: u.inst, reg: u.reg, d: u.d - timeTravelDays, recordId: u.id });
    });
    dl.forEach(doc => {
      if (doc.s < 2) items.push({ kind: 'Document', inst: doc.inst, reg: doc.reg, d: doc.d - timeTravelDays, recordId: doc.id });
    });
    return items.sort((a, b) => a.d - b.d);
  }, [apps, evcs, ul, dl, getDaysLeftForApp, timeTravelDays]);

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

  // ── Actions with Optimistic UI Updates ─────────────────────────────────────
  const handleAdvance = useCallback(async (appId: string) => {
    setActionLoading(`adv-${appId}`);
    const target = A.find(x => x.id === appId);
    const prevStage = target ? (getStage(target) ?? 'Stage') : 'Stage';
    const oldIndex = target ? target.i : 0;
    const oldAge = target ? target.age : 0;

    // 1. Optimistic immediate local update
    if (target) {
      target.i++;
      target.age = 0;
      const nextStage = getStage(target);
      const desc = `${target.id}: ${prevStage} completed → ${nextStage ? `moved to ${nextStage}` : 'forwarded to competent authority'}`;
      setLOG(prev => [{ t: new Date().toLocaleString(), who: roleName, x: desc }, ...prev]);
      setA([...A]);
    }
    showToast('Stage Completed', `${appId} advanced from ${prevStage}`, 'success');

    try {
      if (isLive) {
        await api.advanceApplication(appId, roleName);
        await loadRef.current();
      }
    } catch (err: any) {
      // Rollback on failure
      if (target) {
        target.i = oldIndex;
        target.age = oldAge;
        setA([...A]);
      }
      showToast('Advance Failed', err?.message || 'Action failed on server', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [A, isLive, roleName, showToast]);

  const handleReturn = useCallback(async (appId: string, reason: string) => {
    setActionLoading(`ret-${appId}`);
    const o = A.find(x => x.id === appId);
    const oldIndex = o ? o.i : 0;
    const oldAge = o ? o.age : 0;

    // 1. Optimistic immediate local update
    if (o) {
      o.i = Math.max(0, o.i - 1);
      o.age = 0;
      const desc = `${o.id}: returned to ${getStage(o)} · reason: ${reason}`;
      setLOG(prev => [{ t: new Date().toLocaleString(), who: roleName, x: desc }, ...prev]);
      setA([...A]);
    }
    showToast('Application Returned', `${appId} returned — ${reason}`, 'warn');

    try {
      if (isLive) {
        await api.revertApplication(appId, reason, roleName);
        await loadRef.current();
      }
    } catch (err: any) {
      // Rollback on failure
      if (o) {
        o.i = oldIndex;
        o.age = oldAge;
        setA([...A]);
      }
      showToast('Return Failed', err?.message || 'Action failed on server', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [A, isLive, roleName, showToast]);

  const handleUndertakingAction = useCallback(async (idx: number, uItem: UndertakingRecord) => {
    setActionLoading(`un-${idx}`);
    const isUpload = uItem.s === 0;
    const o = U[idx];
    const prevStatus = o ? o.s : 0;

    // 1. Optimistic immediate local update
    if (o) {
      o.s = isUpload ? 1 : 2;
      const desc = `${o.inst}: ${o.t} ${o.s === 1 ? 'submitted' : 'verified'}`;
      setLOG(prev => [{ t: new Date().toLocaleString(), who: roleName, x: desc }, ...prev]);
      setU([...U]);
    }
    showToast(
      isUpload ? 'Evidence Uploaded' : 'Undertaking Verified',
      `${uItem.inst}: ${uItem.t}`,
      'success',
    );

    try {
      if (isLive && uItem.id) {
        if (isUpload) await api.uploadUndertaking(uItem.id, roleName);
        else          await api.verifyUndertaking(uItem.id, roleName);
        await loadRef.current();
      }
    } catch (err: any) {
      // Rollback on failure
      if (o) {
        o.s = prevStatus;
        setU([...U]);
      }
      showToast('Action Failed', err?.message || 'Could not process undertaking on server', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [U, isLive, roleName, showToast]);

  const handleDocumentAction = useCallback(async (idx: number, dItem: DocumentRecord) => {
    setActionLoading(`dc-${idx}`);
    const isUpload = dItem.s === 0;
    const o = D[idx];
    const prevStatus = o ? o.s : 0;
    const prevDays = o ? o.d : 0;

    // 1. Optimistic immediate local update
    if (o) {
      o.s = isUpload ? 1 : 2;
      if (!isUpload) {
        o.d = o.d < 0 ? 365 : o.d + 365;
      }
      const desc = `${o.inst}: ${o.t} ${o.s === 1 ? 'submitted' : 'verified (+365d)'}`;
      setLOG(prev => [{ t: new Date().toLocaleString(), who: roleName, x: desc }, ...prev]);
      setD([...D]);
    }
    showToast(
      isUpload ? 'Document Uploaded' : 'Document Verified & Renewed',
      `${dItem.inst}: ${dItem.t}${!isUpload ? ' (+365 days)' : ''}`,
      'success',
    );

    try {
      if (isLive && dItem.id) {
        if (isUpload) await api.uploadDocument(dItem.id, roleName);
        else          await api.verifyDocument(dItem.id, roleName);
        await loadRef.current();
      }
    } catch (err: any) {
      // Rollback on failure
      if (o) {
        o.s = prevStatus;
        o.d = prevDays;
        setD([...D]);
      }
      showToast('Action Failed', err?.message || 'Could not process document on server', 'error');
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

  const handleRescheduleEVC = useCallback(async (appId: string, newDays: number) => {
    const target = A.find(x => x.id === appId);
    if (!target) return;
    const oldDays = target.evc;

    // 1. Optimistic immediate update
    target.evc = newDays;
    setA([...A]);
    const desc = `${target.id} (${target.inst}): EVC rescheduled from ${oldDays}d to +${newDays}d`;
    setLOG(prev => [{ t: new Date().toLocaleString(), who: roleName, x: desc }, ...prev]);

    showToast('Inspection Rescheduled', `${target.id} moved to +${newDays}d (${target.inst})`, 'success', {
      duration: 6000,
      undoLabel: 'Undo',
      onUndo: async () => {
        target.evc = oldDays;
        setA([...A]);
        showToast('Reschedule Reverted', `${target.id} restored to ${oldDays}d`, 'info');
        if (isLive) {
          try {
            await api.rescheduleEVC(appId, oldDays, roleName);
            await loadRef.current();
          } catch (err) {
            console.error('Failed to revert reschedule on server', err);
          }
        }
      },
    });

    // 2. Persist to live backend/Supabase
    if (isLive) {
      try {
        await api.rescheduleEVC(appId, newDays, roleName);
        await loadRef.current();
      } catch (err: any) {
        // Rollback on failure
        target.evc = oldDays;
        setA([...A]);
        showToast('Reschedule Failed', err?.message || 'Server error updating EVC schedule', 'error');
      }
    }
  }, [A, isLive, roleName, showToast]);


  const simEventIndexRef = useRef(0);

  const triggerSimulatedEvent = useCallback(() => {
    const eventPool = [
      // 0: New application (6d SLA left, lands in Heatmap column +6 and L1 Attention queue)
      () => {
        const newId = `A-${2623 + Math.floor(Math.random() * 80)}`;
        const names = [
          'Kalinga Institute of Technology',
          'Vellore Technical Academy',
          'Bhopal Engineering Campus',
          'National Polytechnic Guwahati',
          'Sikkim Manipal Institute of Technology',
          'Dharwad Polytechnic Institute',
          'Amrita School of Technology',
        ];
        const instName = names[Math.floor(Math.random() * names.length)];
        const regions = ['East', 'South', 'West', 'North'];
        const reg = regions[Math.floor(Math.random() * regions.length)];
        const newApp: AppRecord = {
          id: newId,
          inst: instName,
          reg,
          rt: 'SE',
          i: 0,
          age: 9, // Scrutiny SLA 15 -> daysLeft = 6d (visible in Heatmap col +6 and attention queue)
          evc: 0,
        };
        setA(prev => [newApp, ...prev]);
        setRecentlyUpdatedId(newId);
        const desc = `New application submitted: ${newId} (${instName}) via Route SE · 6d left in Scrutiny`;
        setLOG(prev => [{ t: new Date().toLocaleTimeString(), who: 'Online Portal', x: desc }, ...prev]);
        setBellUnreadCount(c => c + 1);
        setLastUpdatedTimestamp(Date.now());
        setLatestLiveEvent({
          id: newId,
          type: 'app_new',
          title: `New Application: ${newId}`,
          desc: `${instName} (${reg} Region) submitted under Route SE · 6d SLA horizon`,
          timestamp: new Date().toLocaleTimeString(),
          appId: newId,
          inst: instName,
        });
        showToast('New Application Received', `${instName} submitted ${newId}`, 'info');
      },
      // 1: Document uploaded (decrements Docs Expiring KPI)
      () => {
        const pendingDoc = D.find(d => d.s === 0);
        if (pendingDoc) {
          pendingDoc.s = 1;
          setD([...D]);
          setRecentlyUpdatedId(`doc-${pendingDoc.id}`);
          const desc = `Document uploaded: ${pendingDoc.t} by ${pendingDoc.inst}`;
          setLOG(prev => [{ t: new Date().toLocaleTimeString(), who: 'Institution', x: desc }, ...prev]);
          setBellUnreadCount(c => c + 1);
          setLastUpdatedTimestamp(Date.now());
          setLatestLiveEvent({
            id: `doc-${pendingDoc.id}`,
            type: 'doc_upload',
            title: `Compliance Document Uploaded`,
            desc: `${pendingDoc.inst} submitted verified ${pendingDoc.t}`,
            timestamp: new Date().toLocaleTimeString(),
            recordId: String(pendingDoc.id),
            inst: pendingDoc.inst,
          });
          showToast('Document Uploaded', `${pendingDoc.inst} submitted ${pendingDoc.t}`, 'info');
        }
      },
      // 2: Inspection cleared / stage advanced
      () => {
        const targetEvc = A.find(a => getStage(a) === 'EVC');
        if (targetEvc) {
          targetEvc.i++;
          targetEvc.age = 0;
          setA([...A]);
          setRecentlyUpdatedId(targetEvc.id);
          const nextStage = getStage(targetEvc) || 'Completion';
          const desc = `EVC Inspection cleared for ${targetEvc.id} (${targetEvc.inst}) → advanced to ${nextStage}`;
          setLOG(prev => [{ t: new Date().toLocaleTimeString(), who: 'EVC Committee', x: desc }, ...prev]);
          setBellUnreadCount(c => c + 1);
          setLastUpdatedTimestamp(Date.now());
          setLatestLiveEvent({
            id: targetEvc.id,
            type: 'evc_clear',
            title: `EVC Inspection Cleared`,
            desc: `${targetEvc.inst} verified by Expert Committee · advanced to ${nextStage}`,
            timestamp: new Date().toLocaleTimeString(),
            appId: targetEvc.id,
            inst: targetEvc.inst,
          });
          showToast('Inspection Cleared', `EVC Committee verified ${targetEvc.inst}`, 'success');
        }
      },
      // 3: Statutory SLA escalation alert (increments Stage Overdue KPI)
      () => {
        const nearDue = A.find(a => {
          const s = getStage(a);
          return s === 'Scrutiny' && a.age < 15;
        });
        if (nearDue) {
          nearDue.age = 16; // Now overdue by 1d (L2 Escalation)
          setA([...A]);
          setRecentlyUpdatedId(nearDue.id);
          const desc = `Statutory SLA Breached: ${nearDue.id} (${nearDue.inst}) is now overdue by 1d (L2 Escalation)`;
          setLOG(prev => [{ t: new Date().toLocaleTimeString(), who: 'Statutory Monitor', x: desc }, ...prev]);
          setBellUnreadCount(c => c + 1);
          setLastUpdatedTimestamp(Date.now());
          setLatestLiveEvent({
            id: nearDue.id,
            type: 'sla_warning',
            title: `Statutory SLA Escalation (L2 Alert)`,
            desc: `${nearDue.inst} exceeded Scrutiny processing window · marked Overdue`,
            timestamp: new Date().toLocaleTimeString(),
            appId: nearDue.id,
            inst: nearDue.inst,
          });
          showToast('Statutory Deadline Warning', `${nearDue.inst} is now overdue (L2)`, 'warn');
        }
      },
      // 4: Undertaking cleared (decrements Undertakings At Risk KPI)
      () => {
        const pendingUn = U.find(u => u.s === 0);
        if (pendingUn) {
          pendingUn.s = 2; // Verified
          setU([...U]);
          setRecentlyUpdatedId(`un-${pendingUn.id}`);
          const desc = `Undertaking Verified: #${pendingUn.id} verified for ${pendingUn.inst}`;
          setLOG(prev => [{ t: new Date().toLocaleTimeString(), who: 'Compliance Bureau', x: desc }, ...prev]);
          setBellUnreadCount(c => c + 1);
          setLastUpdatedTimestamp(Date.now());
          setLatestLiveEvent({
            id: `un-${pendingUn.id}`,
            type: 'general',
            title: `Undertaking Verified`,
            desc: `Affidavit verified for ${pendingUn.inst} · risk counter reduced`,
            timestamp: new Date().toLocaleTimeString(),
            recordId: String(pendingUn.id),
            inst: pendingUn.inst,
          });
          showToast('Undertaking Cleared', `Affidavit verified for ${pendingUn.inst}`, 'success');
        }
      },
    ];

    const handler = eventPool[simEventIndexRef.current % eventPool.length];
    simEventIndexRef.current++;
    handler();

    setTimeout(() => setRecentlyUpdatedId(null), 6000);
  }, [A, U, D, aphRules, showToast]);

  // ── Periodic Live Sync & Heartbeat (every 6 seconds) ──────────────────────
  const lastVersionRef = useRef<number>(1);
  useEffect(() => {
    let active = true;
    const interval = setInterval(async () => {
      if (!active) return;
      try {
        const status = await api.getLiveStatus();
        if (!active) return;
        setIsLive(true);
        if (status.version !== lastVersionRef.current) {
          lastVersionRef.current = status.version;
          setLastUpdatedTimestamp(Date.now());
          if (status.last_event) {
            setLatestLiveEvent({
              id: `evt-${status.version}`,
              type: 'general',
              title: 'Live Backend Update',
              desc: status.last_event,
              timestamp: new Date().toLocaleTimeString(),
            });
          }
          await loadRef.current();
        }
      } catch {
        try {
          const healthy = await api.checkHealth();
          if (active) setIsLive(healthy);
        } catch {
          if (active) setIsLive(false);
        }
      }
    }, 6000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // ── Periodic Simulation Timer (runs when simulationActive is enabled) ──────
  useEffect(() => {
    if (!simulationActive) return;
    const interval = setInterval(async () => {
      if (isLive) {
        try {
          const res = await api.triggerSimulatedBackendEvent();
          setLastUpdatedTimestamp(Date.now());
          setBellUnreadCount(c => c + 1);
          if (res.app_id) {
            setRecentlyUpdatedId(res.app_id);
            setTimeout(() => setRecentlyUpdatedId(null), 6000);
          } else if (res.record_id) {
            setRecentlyUpdatedId(`doc-${res.record_id}`);
            setTimeout(() => setRecentlyUpdatedId(null), 6000);
          }
          setLatestLiveEvent({
            id: res.app_id || `evt-${Date.now()}`,
            type: res.app_id ? 'app_new' : 'general',
            title: 'Live Regulatory Event',
            desc: res.event,
            timestamp: new Date().toLocaleTimeString(),
            appId: res.app_id,
          });
          showToast('Live Regulatory Event', res.event, 'info');
          await loadRef.current();
        } catch {
          triggerSimulatedEvent();
        }
      } else {
        triggerSimulatedEvent();
      }
    }, 28000);
    return () => clearInterval(interval);
  }, [isLive, simulationActive, triggerSimulatedEvent, showToast]);

  // ── Time travel trigger ────────────────────────────────────────────────────
  const setTimeTravelDays = useCallback((days: number) => {
    setTimeTravelDaysState(days);
    const simDate = getSimulatedDate(days);
    const targetApps = A.filter(a => getStage(a) !== null);
    const overdueCount = targetApps.filter(a => (getDaysLeft(a, aphRules) - days) < 0).length;
    const pendingCount = targetApps.length - overdueCount;
    showToast(
      `Time Travel: ${formatDemoDate(simDate)}`,
      `${days === 0 ? 'Baseline Demo Date' : `+${days} days offset`} · ${overdueCount} overdue, ${pendingCount} pending`,
      'info'
    );
    setLastUpdatedTimestamp(Date.now());
  }, [A, aphRules, showToast]);

  // ── Reset demo data ────────────────────────────────────────────────────────
  const resetDemoData = useCallback(() => {
    setA(INITIAL_A);
    setU(INITIAL_U);
    setD(INITIAL_D);
    setLOG(INITIAL_LOG);
    setTimeTravelDaysState(0);
    setBellUnreadCount(0);
    setLatestLiveEvent(null);
    setRecentlyUpdatedId(null);
    setLastUpdatedTimestamp(Date.now());
    showToast('Demo Data Reset', 'All records and timelines restored to default', 'info');
  }, [showToast]);

  const value: AppContextValue = {
    theme, setTheme, toggleTheme,
    role, setRole,
    page, setPage,
    isLive,
    simulationActive, setSimulationActive,
    triggerSimulatedEvent,
    lastUpdatedTimestamp,
    bellUnreadCount, clearBellCount,
    recentlyUpdatedId, setRecentlyUpdatedId,
    latestLiveEvent, setLatestLiveEvent,
    timeTravelDays, setTimeTravelDays,
    resetDemoData,
    A, U, D, LOG, aphRules,
    apps, evcs, ul, dl, urgencyItems,
    isAphModalOpen, setIsAphModalOpen,
    toasts, showToast, dismissToast,
    actionLoading,
    handleAdvance, handleReturn,
    handleUndertakingAction, handleDocumentAction,
    handleRescheduleEVC,
    handleSweep, handleSaveAphRules, handleExportCsv,
    searchQuery, setSearchQuery,
    getDaysLeftForApp,
    roleName,
    dataReady,
    pendingAppsFilter, setPendingAppsFilter,
    pendingDrawerAppId, setPendingDrawerAppId,
    currentUser, setCurrentUser, logoutUser,
  };


  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
