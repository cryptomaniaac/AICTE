import { useState, useMemo, useEffect, useRef, useCallback, Fragment } from 'react';
import {
  FileText, Clock, Users, ClipboardCheck, FileSignature,
  ArrowRight, RotateCcw, Bell, CheckCircle, X, AlertTriangle,
  ChevronRight, RefreshCw, ChevronDown, ChevronLeft,
  SlidersHorizontal, Bookmark, Copy, ExternalLink,
  Plus, Check,
} from 'lucide-react';
import { useApp, getStage, alertLevel, formatDays, ROUTES } from '../context/AppContext';
import {
  openApplications, stageOverdue, evcItems,
  undertakingsAtRisk, docsExpiring,
  needsAttentionItems, METRIC_HELP,
} from '../lib/metrics';
import { AreaChart } from '../components/AreaChart';
import type { AreaPoint, BrushRange } from '../components/AreaChart';
import { Heatmap } from '../components/Heatmap';
import type { HeatSelection } from '../components/Heatmap';
import { Donut } from '../components/Donut';
import type { DonutSlice } from '../components/Donut';
import { CardMenu } from '../components/shared/CardMenu';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import { HoverCard } from '../components/HoverCard';
import { ContextMenu } from '../components/ContextMenu';
import { HintChip } from '../components/HintChip';
import type { UrgencyItem, AppRecord } from '../types';

// ── useCountUp ────────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 500): number {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current;
    const diff = target - start;
    if (diff === 0) return;
    const startTime = performance.now();
    let raf: number;
    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      const v = Math.round(start + diff * ease);
      setVal(v);
      if (t < 1) raf = requestAnimationFrame(step);
      else prev.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

// ── KPI Cell ──────────────────────────────────────────────────────────────────
function KpiCell({
  icon: Icon, label, value, context, active, onClick, helpText,
}: {
  icon: React.ElementType; label: string; value: number;
  context: string; active: boolean; onClick: () => void; helpText?: string;
}) {
  const displayed = useCountUp(value);
  return (
    <button
      className={`kpi-cell${active ? ' active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${label}: ${value}. ${helpText || ''}`}
      title={helpText}
    >
      <div className="kpi-icon" aria-hidden="true"><Icon size={16} /></div>
      <span className="kpi-cell-label">{label}</span>
      <span className="kpi-cell-number tabnum">{displayed}</span>
      <span className="kpi-cell-context">{context}</span>
    </button>
  );
}

// ── Sweep Modal ───────────────────────────────────────────────────────────────
interface SweepResult {
  l3: UrgencyItem[];
  l2: UrgencyItem[];
  l1: UrgencyItem[];
}

function SweepSection({
  level, items, desc,
}: { level: string; items: UrgencyItem[]; desc: string }) {
  if (items.length === 0) return null;
  const chipClass = level === 'L3' ? 'chip-l3' : level === 'L2' ? 'chip-l2' : 'chip-l1';
  const bgVar = level === 'L3' ? 'var(--red-bg)' : level === 'L2' ? 'var(--amber-bg)' : 'var(--blue-bg)';
  return (
    <div style={{
      marginBottom: 16, background: bgVar, borderRadius: 10,
      padding: '12px 14px', animation: 'fadeIn .3s ease-out',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span className={`chip ${chipClass}`}>{level}</span>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)' }}>{desc}</span>
        <span className="tabnum" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>{items.length}</span>
      </div>
      {items.slice(0, 4).map((item, i) => (
        <div key={i} style={{
          fontSize: 12, color: 'var(--text-2)', padding: '3px 0',
          borderBottom: i < Math.min(items.length, 4) - 1 ? '1px solid var(--border)' : 'none',
        }}>
          <span style={{ fontWeight: 500 }}>{item.inst}</span>
          <span style={{ color: 'var(--muted)', marginLeft: 6 }}>{item.kind} · {formatDays(item.d)}</span>
        </div>
      ))}
      {items.length > 4 && (
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>+{items.length - 4} more</div>
      )}
    </div>
  );
}

function SweepModal({ result, onClose, onViewAudit }: {
  result: SweepResult; onClose: () => void; onViewAudit: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setTimeout(() => closeRef.current?.focus(), 50);
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);
  const total = result.l3.length + result.l2.length + result.l1.length;
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="sweep-title">
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bell size={18} style={{ color: 'var(--primary)' }} aria-hidden="true" />
            <span className="modal-title" id="sweep-title">Alert Sweep Complete</span>
          </div>
          <button ref={closeRef} className="icon-btn" onClick={onClose} aria-label="Close sweep results">
            <X size={15} />
          </button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
            <strong className="tabnum" style={{ color: 'var(--text)' }}>{total}</strong> notifications dispatched.
          </p>
          <SweepSection level="L3" items={result.l3} desc="Notify Bureau — critical overdue" />
          <SweepSection level="L2" items={result.l2} desc="Notify Regional officer" />
          <SweepSection level="L1" items={result.l1} desc="Remind Institution" />
          {total === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)' }}>
              <CheckCircle size={32} style={{ marginBottom: 8, color: 'var(--green)' }} />
              <div style={{ fontWeight: 600 }}>All items are within SLA</div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={onViewAudit}>
            View in Audit Trail <ChevronRight size={13} />
          </button>
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

// ── App Drawer ────────────────────────────────────────────────────────────────
function AppDrawer({
  app, onClose, onAdvance, onReturn, actionLoading, getDaysLeft, log,
  onPrev, onNext, hasPrev, hasNext,
}: {
  app: AppRecord; onClose: () => void;
  onAdvance: (id: string) => Promise<void>;
  onReturn: (id: string, reason: string) => Promise<void>;
  actionLoading: string | null;
  getDaysLeft: (a: AppRecord) => number;
  log: { t: string; who: string; x: string }[];
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}) {
  const [tab, setTab] = useState<'details' | 'timeline' | 'documents' | 'activity'>('details');
  const [reason, setReason] = useState('Deficiency');
  const [showReturnConfirm, setShowReturnConfirm] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [localNotes, setLocalNotes] = useState<{ t: string; who: string; note: string }[]>([]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const stages = ROUTES[app.rt] || [];
  const isLast = app.i === stages.length - 1;
  const currentStage = getStage(app);
  const daysLeft = getDaysLeft(app);
  const isAdvancing = actionLoading === `adv-${app.id}`;
  const isReturning = actionLoading === `ret-${app.id}`;
  const appLogs = log.filter(l => l.x.includes(app.id));
  const lvl = alertLevel(daysLeft);

  useEffect(() => {
    setTimeout(() => closeRef.current?.focus(), 50);
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.key === 'j' || e.key === 'ArrowDown') && onNext && hasNext) onNext();
      if ((e.key === 'k' || e.key === 'ArrowUp') && onPrev && hasPrev) onPrev();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose, onNext, onPrev, hasNext, hasPrev]);

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    setLocalNotes(prev => [
      { t: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), who: 'Officer', note: newNote.trim() },
      ...prev,
    ]);
    setNewNote('');
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} aria-hidden="true" />
      <div className="drawer" role="dialog" aria-modal="true" aria-labelledby="ov-drawer-title">
        <div className="drawer-handle" aria-hidden="true" />
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="drawer-title" id="ov-drawer-title">{app.id} · {app.inst}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {onPrev && (
                <button className="icon-btn" onClick={onPrev} disabled={!hasPrev} title="Previous application (k or ↑)" aria-label="Previous application">
                  <ChevronLeft size={15} />
                </button>
              )}
              {onNext && (
                <button className="icon-btn" onClick={onNext} disabled={!hasNext} title="Next application (j or ↓)" aria-label="Next application">
                  <ChevronRight size={15} />
                </button>
              )}
            </div>
          </div>
          <button ref={closeRef} className="icon-btn" onClick={onClose} aria-label="Close drawer">
            <X size={15} />
          </button>
        </div>

        {/* Drawer Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 16px', background: 'var(--surface)' }}>
          {(['details', 'timeline', 'documents', 'activity'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 14px', fontSize: '12.5px', fontWeight: tab === t ? 600 : 500,
                color: tab === t ? 'var(--primary)' : 'var(--muted)',
                borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
                textTransform: 'capitalize', transition: 'color var(--dur-fast), border-color var(--dur-fast)',
              }}
              aria-selected={tab === t}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="drawer-body">
          {tab === 'details' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Region', value: <span className="chip chip-grey">{app.reg}</span> },
                  { label: 'Route', value: <code style={{ fontFamily: 'monospace', fontWeight: 700 }}>{app.rt}</code> },
                  { label: 'Current Stage', value: <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{currentStage || '—'}</span> },
                  { label: 'Escalation', value: <span className={`chip chip-${lvl === 'L3' ? 'l3' : lvl === 'L2' ? 'l2' : lvl === 'L1' ? 'l1' : 'grey'}`}>{lvl === 'none' ? 'OK' : lvl}</span> },
                  { label: 'Days in Stage', value: <span className="tabnum">{app.age}d</span> },
                  { label: 'SLA Remaining', value: <span className="tabnum" style={{ color: daysLeft < 0 ? 'var(--red)' : daysLeft <= 15 ? 'var(--amber)' : 'var(--green)' }}>{formatDays(daysLeft)}</span> },
                ].map(item => (
                  <div key={item.label}>
                    <div className="form-label" style={{ marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{item.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 20 }}>
                <div className="form-label" style={{ marginBottom: 10 }}>Stage Actions</div>
                <button
                  className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}
                  onClick={() => onAdvance(app.id)}
                  disabled={isAdvancing || isReturning}
                >
                  {isAdvancing ? 'Processing…' : isLast ? 'Forward to Competent Authority' : `Complete ${currentStage} Stage`}
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select className="form-select" value={reason} onChange={e => setReason(e.target.value)}
                    style={{ flex: 1 }} aria-label="Return reason">
                    <option>Deficiency</option>
                    <option>Clarification</option>
                    <option>Further verification</option>
                  </select>
                  <button className="btn btn-secondary" onClick={() => setShowReturnConfirm(true)}
                    disabled={isAdvancing || isReturning} aria-label={`Return: ${reason}`}>
                    <RotateCcw size={13} aria-hidden="true" /> Return
                  </button>
                </div>
              </div>
            </>
          )}

          {tab === 'timeline' && (
            <div style={{ marginBottom: 20 }}>
              <div className="form-label" style={{ marginBottom: 12 }}>Route Stepper</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 6 }}>
                {stages.map((s, j) => {
                  const isDone = j < app.i;
                  const isCurrent = j === app.i;
                  return (
                    <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, position: 'relative' }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: isDone ? 'var(--green)' : isCurrent ? 'var(--primary)' : 'var(--border)',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, flexShrink: 0, zIndex: 1,
                      }}>
                        {isDone ? '✓' : j + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: isCurrent ? 600 : 500, color: isCurrent ? 'var(--primary)' : 'var(--text)' }}>
                          {s} {isCurrent && <span className="chip chip-blue" style={{ fontSize: 10, marginLeft: 6 }}>Current</span>}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                          {isDone ? 'Stage successfully cleared' : isCurrent ? `${app.age} days in progress` : 'Pending prior approvals'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'documents' && (
            <div>
              <div className="form-label" style={{ marginBottom: 10 }}>Submitted Application Documents</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { name: 'Institutional Land & Ownership Deed', status: 'Verified', date: 'Uploaded 12 Oct' },
                  { name: 'Architectural Safety & Barrier-Free Plan', status: 'Verified', date: 'Uploaded 14 Oct' },
                  { name: 'Faculty Cadre & Ratio Compliance Certificate', status: 'Under Review', date: 'Uploaded 18 Oct' },
                  { name: 'Affiliation & NOC from State Directorate', status: 'Pending Verification', date: 'Uploaded 22 Oct' },
                ].map((doc, idx) => (
                  <div key={idx} style={{
                    padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)',
                    borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)' }}>{doc.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{doc.date}</div>
                    </div>
                    <span className={`chip ${doc.status === 'Verified' ? 'chip-green' : doc.status === 'Under Review' ? 'chip-amber' : 'chip-grey'}`}>
                      {doc.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'activity' && (
            <div>
              <div style={{ marginBottom: 18, background: 'var(--surface-2)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                <div className="form-label" style={{ marginBottom: 6 }}>Add Officer Note</div>
                <textarea
                  className="form-input"
                  rows={2}
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Record an observation or compliance finding…"
                  style={{ width: '100%', resize: 'none', marginBottom: 8, fontSize: 12.5 }}
                />
                <button className="btn btn-secondary btn-xs" onClick={handleAddNote} disabled={!newNote.trim()}>
                  <Plus size={12} /> Save Note
                </button>
              </div>

              {localNotes.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div className="form-label" style={{ marginBottom: 6 }}>Recent Notes</div>
                  {localNotes.map((n, i) => (
                    <div key={i} style={{ padding: '8px 10px', background: 'var(--primary-50)', borderRadius: 6, marginBottom: 6, fontSize: 12 }}>
                      <div style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 11, marginBottom: 2 }}>{n.who} · {n.t}</div>
                      <div style={{ color: 'var(--text)' }}>{n.note}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="form-label" style={{ marginBottom: 8 }}>Audit History</div>
              {appLogs.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>No history for this application.</p>
              ) : (
                <div className="timeline">
                  {appLogs.map((l, i) => (
                    <div key={i} className="timeline-item">
                      <div className="timeline-dot blue" />
                      <div>
                        <div className="audit-ts">{l.t}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 2 }}>{l.x}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>by {l.who}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        isOpen={showReturnConfirm}
        onClose={() => setShowReturnConfirm(false)}
        onConfirm={async () => { setShowReturnConfirm(false); await onReturn(app.id, reason); }}
        title="Return Application"
        message={<>Return <strong>{app.id}</strong> for <strong>{reason}</strong>? This will be logged.</>}
        confirmLabel="Return Application"
        confirmVariant="danger"
        loading={isReturning}
      />
    </>
  );
}

// ── Attention Table ───────────────────────────────────────────────────────────
type LevelFilter = 'All' | 'L3' | 'L2' | 'L1';

function AttentionTable({
  items, heatFilter, donutStage, kpiFilter, brushFilter,
  hoveredTarget, onHoverRow,
  onNavigateApps, onNavigateEs,
  onAdvance, onUndertakingAction, onDocumentAction,
  actionLoading, getDaysLeft, apps, LOG, handleReturn,
  onClearHeat, onClearDonut, onClearKpi, onClearBrush,
}: {
  items: UrgencyItem[];
  heatFilter: HeatSelection | null;
  donutStage: string | null;
  kpiFilter: string | null;
  brushFilter: BrushRange | null;
  hoveredTarget: any;
  onHoverRow: (info: { region: string; stage?: string; day: number } | null) => void;
  onNavigateApps: (stage?: string) => void;
  onNavigateEs: () => void;
  onAdvance: (id: string) => Promise<void>;
  onUndertakingAction: (idx: number, u: any) => Promise<void>;
  onDocumentAction: (idx: number, d: any) => Promise<void>;
  actionLoading: string | null;
  getDaysLeft: (a: AppRecord) => number;
  apps: AppRecord[];
  LOG: { t: string; who: string; x: string }[];
  handleReturn: (id: string, reason: string) => Promise<void>;
  onClearHeat: () => void;
  onClearDonut: () => void;
  onClearKpi: () => void;
  onClearBrush: () => void;
}) {
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('All');
  const [instFilter, setInstFilter] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<AppRecord | null>(null);
  const [selectedAppIdx, setSelectedAppIdx] = useState<number>(0);
  const [sortCol, setSortCol] = useState<'level' | 'inst' | 'timeline'>('level');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Multi-select & Shift-click
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const lastClickedIdx = useRef<number | null>(null);

  // Column visibility
  const [cols, setCols] = useState<{ level: boolean; item: boolean; inst: boolean; reg: boolean; timeline: boolean }>(() => {
    try {
      const saved = localStorage.getItem('aicte_table_cols');
      return saved ? JSON.parse(saved) : { level: true, item: true, inst: true, reg: true, timeline: true };
    } catch {
      return { level: true, item: true, inst: true, reg: true, timeline: true };
    }
  });
  const [showColMenu, setShowColMenu] = useState(false);

  // Saved Views
  const [savedViews, setSavedViews] = useState<{ name: string; filter: any }[]>(() => {
    try {
      const saved = localStorage.getItem('aicte_saved_views');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [showViewsMenu, setShowViewsMenu] = useState(false);

  // Inline row expand
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  // Context Menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: UrgencyItem; idx: number } | null>(null);

  // Header shadow on scroll
  const [scrolled, setScrolled] = useState(false);

  const toggleCol = (k: keyof typeof cols) => {
    setCols(c => {
      const updated = { ...c, [k]: !c[k] };
      localStorage.setItem('aicte_table_cols', JSON.stringify(updated));
      return updated;
    });
  };

  const resetCols = () => {
    const def = { level: true, item: true, inst: true, reg: true, timeline: true };
    setCols(def);
    localStorage.setItem('aicte_table_cols', JSON.stringify(def));
  };

  const handleSaveCurrentView = () => {
    const name = window.prompt('Name this view:');
    if (!name || !name.trim()) return;
    const viewObj = { name: name.trim(), filter: { levelFilter, kpiFilter, donutStage } };
    const updated = [...savedViews.filter(v => v.name !== name.trim()), viewObj];
    setSavedViews(updated);
    localStorage.setItem('aicte_saved_views', JSON.stringify(updated));
  };

  const handleApplyView = (viewName: string) => {
    setShowViewsMenu(false);
    if (viewName === 'All') {
      setLevelFilter('All');
      onClearHeat();
      onClearDonut();
      onClearKpi();
      onClearBrush();
      setInstFilter(null);
    } else if (viewName === 'My overdue') {
      setLevelFilter('All');
      onClearHeat();
      onClearDonut();
      onClearBrush();
      setInstFilter(null);
      // set kpiFilter to overdue
    } else if (viewName === 'Due this week') {
      setLevelFilter('All');
    } else if (viewName === 'All L3') {
      setLevelFilter('L3');
    } else {
      const found = savedViews.find(v => v.name === viewName);
      if (found) {
        if (found.filter.levelFilter) setLevelFilter(found.filter.levelFilter);
      }
    }
  };

  const sorted = useMemo(() => needsAttentionItems(items), [items]);

  const filtered = useMemo(() => {
    let list = [...sorted];
    if (heatFilter) {
      list = list.filter(x => {
        if (x.reg !== heatFilter.region) return false;
        if (heatFilter.day === 'overdue') return x.d < 0;
        return x.d >= 0 && Math.floor(x.d) === heatFilter.day;
      });
    }
    if (donutStage) list = list.filter(x => x.stage === donutStage || x.kind === donutStage);
    if (kpiFilter) {
      if (kpiFilter === 'open') list = list.filter(x => x.kind === 'Stage');
      else if (kpiFilter === 'overdue') list = list.filter(x => x.kind === 'Stage' && x.d < 0);
      else if (kpiFilter === 'evc') list = list.filter(x => x.kind === 'EVC');
      else if (kpiFilter === 'un') list = list.filter(x => x.kind === 'Undertaking');
      else if (kpiFilter === 'docs') list = list.filter(x => x.kind === 'Document');
    }
    if (brushFilter) {
      list = list.filter(x => x.d >= brushFilter.startDay && x.d <= brushFilter.endDay);
    }
    if (instFilter) {
      list = list.filter(x => x.inst.toLowerCase().includes(instFilter.toLowerCase()));
    }
    if (levelFilter !== 'All') list = list.filter(x => alertLevel(x.d) === levelFilter);
    list.sort((a, b) => {
      let v = 0;
      if (sortCol === 'inst') v = a.inst.localeCompare(b.inst);
      else v = a.d - b.d;
      return sortDir === 'asc' ? v : -v;
    });
    return list;
  }, [sorted, heatFilter, donutStage, kpiFilter, brushFilter, instFilter, levelFilter, sortCol, sortDir]);

  const hasFilter = !!(heatFilter || donutStage || kpiFilter || brushFilter || instFilter || levelFilter !== 'All');
  const counts = useMemo<Record<LevelFilter, number>>(() => ({
    All: sorted.length,
    L3: sorted.filter(x => alertLevel(x.d) === 'L3').length,
    L2: sorted.filter(x => alertLevel(x.d) === 'L2').length,
    L1: sorted.filter(x => alertLevel(x.d) === 'L1').length,
  }), [sorted]);

  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const SortArrow = ({ col }: { col: string }) => (
    <span aria-hidden="true" style={{ opacity: sortCol === col ? 1 : 0.3, fontSize: 10 }}>
      {sortCol === col && sortDir === 'desc' ? ' ↓' : ' ↑'}
    </span>
  );

  const handleAction = async (item: UrgencyItem, idx: number) => {
    if (item.kind === 'Stage' && item.appId) {
      const a = apps.find(a => a.id === item.appId);
      if (a) {
        setSelectedApp(a);
        const appIdx = apps.findIndex(x => x.id === a.id);
        setSelectedAppIdx(appIdx >= 0 ? appIdx : 0);
      }
    } else if (item.kind === 'EVC') {
      onNavigateApps();
    } else if (item.kind === 'Undertaking' && item.recordId !== undefined) {
      await onUndertakingAction(idx, { id: item.recordId, inst: item.inst, t: 'Undertaking', d: item.d, s: 0, reg: item.reg });
    } else if (item.kind === 'Document' && item.recordId !== undefined) {
      await onDocumentAction(idx, { id: item.recordId, inst: item.inst, t: 'Document', d: item.d, s: 0, reg: item.reg });
    }
  };

  const SHOWN = 6;
  const displayed = filtered.slice(0, SHOWN);
  const total = items.length;

  // Row selection handler
  const handleRowClick = (e: React.MouseEvent, item: UrgencyItem, idx: number) => {
    const key = `${item.kind}-${item.appId ?? item.recordId}`;
    if (e.shiftKey && lastClickedIdx.current !== null) {
      const start = Math.min(lastClickedIdx.current, idx);
      const end = Math.max(lastClickedIdx.current, idx);
      const newKeys = new Set(selectedKeys);
      for (let i = start; i <= end; i++) {
        const k = `${displayed[i].kind}-${displayed[i].appId ?? displayed[i].recordId}`;
        newKeys.add(k);
      }
      setSelectedKeys(newKeys);
    } else if (e.metaKey || e.ctrlKey) {
      const newKeys = new Set(selectedKeys);
      if (newKeys.has(key)) newKeys.delete(key);
      else newKeys.add(key);
      setSelectedKeys(newKeys);
      lastClickedIdx.current = idx;
    } else {
      lastClickedIdx.current = idx;
      handleAction(item, idx);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: UrgencyItem, idx: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, item, idx });
  };

  const toggleExpand = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleBulkAdvance = async () => {
    for (const key of Array.from(selectedKeys)) {
      const item = displayed.find(d => `${d.kind}-${d.appId ?? d.recordId}` === key);
      if (item && item.kind === 'Stage' && item.appId) {
        await onAdvance(item.appId);
      }
    }
    setSelectedKeys(new Set());
  };

  const handleBulkVerify = async () => {
    for (const key of Array.from(selectedKeys)) {
      const idx = displayed.findIndex(d => `${d.kind}-${d.appId ?? d.recordId}` === key);
      if (idx >= 0) {
        const item = displayed[idx];
        if (item.kind === 'Undertaking' && item.recordId !== undefined) {
          await onUndertakingAction(idx, { id: item.recordId, inst: item.inst, t: 'Undertaking', d: item.d, s: 0, reg: item.reg });
        } else if (item.kind === 'Document' && item.recordId !== undefined) {
          await onDocumentAction(idx, { id: item.recordId, inst: item.inst, t: 'Document', d: item.d, s: 0, reg: item.reg });
        }
      }
    }
    setSelectedKeys(new Set());
  };

  const visibleColCount = 1 + (cols.level ? 1 : 0) + (cols.item ? 1 : 0) + (cols.inst ? 1 : 0) + (cols.reg ? 1 : 0) + (cols.timeline ? 1 : 0) + 1;

  return (
    <div className="panel" style={{ marginTop: 20 }} onMouseLeave={() => onHoverRow(null)}>
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="panel-title">
            <AlertTriangle size={16} style={{ color: 'var(--amber)' }} aria-hidden="true" />
            Needs attention today
          </span>
          {/* Views dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              className="btn btn-secondary btn-xs"
              onClick={() => setShowViewsMenu(!showViewsMenu)}
              aria-label="Saved views"
            >
              <Bookmark size={11} /> Views <ChevronDown size={10} />
            </button>
            {showViewsMenu && (
              <div className="views-menu">
                <div style={{ padding: '4px 8px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                  Preset Views
                </div>
                {['All', 'My overdue', 'Due this week', 'All L3'].map(v => (
                  <button key={v} className="context-menu-item" onClick={() => handleApplyView(v)}>
                    {v}
                  </button>
                ))}
                {savedViews.length > 0 && (
                  <>
                    <div className="context-menu-sep" />
                    <div style={{ padding: '4px 8px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                      Saved
                    </div>
                    {savedViews.map(v => (
                      <button key={v.name} className="context-menu-item" onClick={() => handleApplyView(v.name)}>
                        {v.name}
                      </button>
                    ))}
                  </>
                )}
                <div className="context-menu-sep" />
                <button className="context-menu-item" onClick={handleSaveCurrentView} style={{ color: 'var(--primary)' }}>
                  <Plus size={12} /> Save current view…
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {filtered.length < sorted.length && (
            <span className="tabnum" style={{ fontSize: 12, color: 'var(--muted)', transition: 'transform var(--dur-fast)' }}>
              {filtered.length} of {sorted.length}
            </span>
          )}

          {/* Columns menu toggle */}
          <div style={{ position: 'relative' }}>
            <button
              className="icon-btn"
              onClick={() => setShowColMenu(!showColMenu)}
              title="Show/hide columns"
              aria-label="Customize columns"
            >
              <SlidersHorizontal size={14} />
            </button>
            {showColMenu && (
              <div className="col-menu">
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Columns
                </div>
                {(['level', 'item', 'inst', 'reg', 'timeline'] as (keyof typeof cols)[]).map(c => (
                  <label key={c} className="col-menu-item">
                    <input type="checkbox" checked={cols[c]} onChange={() => toggleCol(c)} />
                    <span style={{ textTransform: 'capitalize' }}>{c === 'inst' ? 'Institution' : c === 'reg' ? 'Region' : c}</span>
                  </label>
                ))}
                <div style={{ marginTop: 6, borderTop: '1px solid var(--border)', paddingTop: 6 }}>
                  <button className="btn btn-ghost btn-xs" style={{ width: '100%' }} onClick={resetCols}>
                    Reset columns
                  </button>
                </div>
              </div>
            )}
          </div>

          <CardMenu items={[{ label: 'View all in Escalations', onClick: onNavigateEs }]} />
        </div>
      </div>

      {hasFilter && (
        <div className="active-filters">
          <span className="active-filters-label">Filtered by</span>
          {heatFilter && (
            <button className="active-filter-chip" onClick={onClearHeat}>
              {heatFilter.region} · {heatFilter.day === 'overdue' ? 'Overdue' : `+${heatFilter.day}d`}
              <X size={10} />
            </button>
          )}
          {donutStage && (
            <button className="active-filter-chip" onClick={onClearDonut}>
              Stage: {donutStage} <X size={10} />
            </button>
          )}
          {kpiFilter && (
            <button className="active-filter-chip" onClick={onClearKpi}>
              KPI: {kpiFilter} <X size={10} />
            </button>
          )}
          {brushFilter && (
            <button className="active-filter-chip" onClick={onClearBrush}>
              Selected: {brushFilter.startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {brushFilter.endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              <X size={10} />
            </button>
          )}
          {instFilter && (
            <button className="active-filter-chip" onClick={() => setInstFilter(null)}>
              Institution: {instFilter} <X size={10} />
            </button>
          )}
          <button className="active-filters-clear" onClick={() => {
            onClearHeat(); onClearDonut(); onClearKpi(); onClearBrush(); setInstFilter(null); setLevelFilter('All');
          }}>Clear all</button>
        </div>
      )}

      <div className="filter-chips">
        {(['All', 'L3', 'L2', 'L1'] as LevelFilter[]).map(lf => (
          <button
            key={lf}
            className={`filter-chip${levelFilter === lf ? ' active' : ''}`}
            onClick={() => setLevelFilter(lf)}
            aria-pressed={levelFilter === lf}
          >
            {lf} <span className="filter-chip-count tabnum">{counts[lf]}</span>
          </button>
        ))}
      </div>

      <div
        className="table-wrap"
        onScroll={e => {
          const top = (e.target as HTMLElement).scrollTop;
          if (top > 4 !== scrolled) setScrolled(top > 4);
        }}
      >
        <table className="attention-table" role="grid">
          <thead className={scrolled ? 'header-shadow' : ''}>
            <tr>
              <th style={{ width: 36 }}></th>
              {cols.level && (
                <th style={{ width: 84 }}>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit', fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}
                    onClick={() => handleSort('level')}
                    aria-sort={sortCol === 'level' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    Level <SortArrow col="level" />
                  </button>
                </th>
              )}
              {cols.item && <th>Item</th>}
              {cols.inst && (
                <th style={{ width: 180 }}>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit', fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}
                    onClick={() => handleSort('inst')}
                    aria-sort={sortCol === 'inst' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    Institution <SortArrow col="inst" />
                  </button>
                </th>
              )}
              {cols.reg && <th style={{ width: 75 }}>Region</th>}
              {cols.timeline && (
                <th style={{ width: 105 }}>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit', fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}
                    onClick={() => handleSort('timeline')}
                    aria-sort={sortCol === 'timeline' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    Timeline <SortArrow col="timeline" />
                  </button>
                </th>
              )}
              <th style={{ width: 140 }} className="cell-action">Quick Action</th>
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={visibleColCount} style={{ textAlign: 'center', padding: hasFilter ? '32px 0' : '16px 0', color: 'var(--muted)', fontSize: 13 }}>
                  {hasFilter ? (
                    'No items match the current filters.'
                  ) : (
                    <div className="all-clear">
                      <div className="all-clear-circle">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" className="check-path" />
                        </svg>
                      </div>
                      <h3>All clear!</h3>
                      <p>No applications or visits require immediate action today.</p>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              displayed.map((item, idx) => {
                const rowKey = `${item.kind}-${item.appId ?? item.recordId}-${idx}`;
                const selKey = `${item.kind}-${item.appId ?? item.recordId}`;
                const isSelected = selectedKeys.has(selKey);
                const isExpanded = expandedKeys.has(rowKey);
                const lvl = alertLevel(item.d);
                const levelChipClass = lvl === 'L3' ? 'chip-l3' : lvl === 'L2' ? 'chip-l2' : lvl === 'L1' ? 'chip-l1' : 'chip-grey';
                const timelineChipClass = levelChipClass;
                const actionLabel = item.kind === 'Stage' ? 'Advance' : item.kind === 'EVC' ? 'Open' : 'Verify';
                const isLoading = actionLoading === `adv-${item.appId}` || actionLoading === `un-${item.recordId}` || actionLoading === `dc-${item.recordId}`;

                // Bidirectional Linked View highlighting
                let isHighlighted = false;
                let isDimmed = false;
                if (hoveredTarget) {
                  if (hoveredTarget.type === 'stage') {
                    if (item.stage === hoveredTarget.value || item.kind === hoveredTarget.value) isHighlighted = true;
                    else isDimmed = true;
                  } else if (hoveredTarget.type === 'heat') {
                    const matchReg = item.reg === hoveredTarget.region;
                    const matchDay = hoveredTarget.day === 'overdue' ? item.d < 0 : Math.floor(item.d) === hoveredTarget.day;
                    if (matchReg && matchDay) isHighlighted = true;
                    else isDimmed = true;
                  } else if (hoveredTarget.type === 'day') {
                    if (Math.floor(item.d) === hoveredTarget.day) isHighlighted = true;
                    else isDimmed = true;
                  }
                }

                // Related app record for hovercard and expand
                const appRec = item.appId ? apps.find(a => a.id === item.appId) : null;
                const instApps = apps.filter(a => a.inst === item.inst);
                const instOverdue = instApps.filter(a => getDaysLeft(a) < 0).length;

                return (
                  <Fragment key={rowKey}>
                    <tr
                      className={`clickable ${isSelected ? 'row-highlighted' : ''} ${isHighlighted ? 'row-highlighted' : ''} ${isDimmed ? 'row-dimmed' : ''}`}
                      onClick={e => handleRowClick(e, item, idx)}
                      onContextMenu={e => handleContextMenu(e, item, idx)}
                      onMouseEnter={() => onHoverRow({ region: item.reg, stage: item.stage || item.kind, day: Math.floor(item.d) })}
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleAction(item, idx);
                        }
                      }}
                      aria-label={`${item.inst} — ${item.kind} — ${formatDays(item.d)}`}
                    >
                      {/* Chevron expand */}
                      <td onClick={e => e.stopPropagation()} style={{ padding: '0 4px', textAlign: 'center' }}>
                        <button
                          className="icon-btn"
                          style={{ width: 22, height: 22, transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform var(--dur-fast)' }}
                          onClick={e => toggleExpand(rowKey, e)}
                          title="Expand row details"
                          aria-label="Expand row details"
                        >
                          <ChevronRight size={12} />
                        </button>
                      </td>

                      {cols.level && (
                        <td><span className={`chip ${levelChipClass}`}>{lvl === 'none' ? '—' : lvl}</span></td>
                      )}

                      {cols.item && (
                        <td>
                          <span className="cell-title">
                            {item.kind === 'Stage' ? `${item.stage ?? ''} review`
                              : item.kind === 'EVC' ? 'Expert visit due'
                              : item.kind === 'Undertaking' ? 'Undertaking pending'
                              : 'Document expiring'}
                          </span>
                          <span className="cell-sub">{item.kind} · {item.appId ?? `#${item.recordId}`}</span>
                        </td>
                      )}

                      {cols.inst && (
                        <td>
                          <HoverCard
                            content={
                              <div>
                                <div className="hover-card-title">{item.inst}</div>
                                <div className="hover-card-row">
                                  <span>Region</span>
                                  <span>{item.reg}</span>
                                </div>
                                <div className="hover-card-row">
                                  <span>Open Applications</span>
                                  <span>{instApps.length || 1}</span>
                                </div>
                                <div className="hover-card-row">
                                  <span>Overdue</span>
                                  <span style={{ color: instOverdue > 0 ? 'var(--red)' : 'var(--green)' }}>{instOverdue}</span>
                                </div>
                                <div className="hover-card-row">
                                  <span>Next Deadline</span>
                                  <span>{formatDays(item.d)}</span>
                                </div>
                                <button className="hover-card-link" onClick={() => handleAction(item, idx)}>
                                  Open application details →
                                </button>
                              </div>
                            }
                          >
                            {({ ref, onMouseEnter, onMouseLeave }) => (
                              <span
                                ref={ref}
                                onMouseEnter={onMouseEnter}
                                onMouseLeave={onMouseLeave}
                                className="cell-inst"
                                style={{ borderBottom: '1px dotted var(--muted)' }}
                              >
                                {item.inst}
                              </span>
                            )}
                          </HoverCard>
                        </td>
                      )}

                      {cols.reg && <td><span className="chip chip-grey">{item.reg}</span></td>}

                      {cols.timeline && <td><span className={`chip ${timelineChipClass}`}>{formatDays(item.d)}</span></td>}

                      {/* Quick action buttons on hover */}
                      <td className="cell-action" onClick={e => e.stopPropagation()}>
                        <div className="row-actions">
                          <button
                            className="row-action-btn"
                            onClick={() => handleAction(item, idx)}
                            disabled={isLoading}
                            aria-label={`${actionLabel} ${item.inst}`}
                          >
                            {isLoading ? '…' : actionLabel}
                          </button>
                          {item.kind === 'Stage' && (
                            <button
                              className="row-action-btn"
                              onClick={() => {
                                const a = apps.find(x => x.id === item.appId);
                                if (a) setSelectedApp(a);
                              }}
                              title="Open in Drawer"
                            >
                              Open
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Inline Row Expand Strip */}
                    {isExpanded && (
                      <tr className="row-expand-strip">
                        <td colSpan={visibleColCount}>
                          <div className="row-expand-inner">
                            <div>
                              <div className="expand-section-title">Stage Workflow Progress</div>
                              {appRec ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                                  {(ROUTES[appRec.rt] || []).map((s, j) => (
                                    <span key={j} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <span className={`stage-chip${j < appRec.i ? ' done' : j === appRec.i ? ' active' : ''}`}>
                                        {s}
                                      </span>
                                      {j < (ROUTES[appRec.rt] || []).length - 1 && <ArrowRight size={10} style={{ color: 'var(--muted)' }} />}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                                  Compliance item: {item.kind} · Region {item.reg}
                                </div>
                              )}
                            </div>

                            <div>
                              <div className="expand-section-title">Recent Audit Log</div>
                              {LOG.filter(l => item.appId && l.x.includes(item.appId)).slice(0, 2).map((l, i) => (
                                <div key={i} style={{ fontSize: 11.5, color: 'var(--text-2)', padding: '2px 0' }}>
                                  <span style={{ color: 'var(--muted)' }}>{l.t}</span> — {l.x}
                                </div>
                              ))}
                              {LOG.filter(l => item.appId && l.x.includes(item.appId)).length === 0 && (
                                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>No recent audit events logged.</div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {total > SHOWN && (
        <div className="table-link-row">
          <button className="table-link" onClick={onNavigateEs}>
            View all {total} in Escalations <ChevronRight size={13} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Sticky Bulk Bar */}
      {selectedKeys.size > 0 && (
        <div className="sticky-bulk-bar">
          <span className="sticky-bulk-count tabnum">{selectedKeys.size} selected</span>
          <div className="sticky-bulk-actions">
            <button className="btn btn-primary btn-sm" onClick={handleBulkAdvance}>
              Advance Eligible
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleBulkVerify}>
              Verify Eligible
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedKeys(new Set())}>
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            {
              label: 'Open Details',
              icon: <ExternalLink size={13} />,
              onClick: () => handleAction(contextMenu.item, contextMenu.idx),
            },
            {
              label: contextMenu.item.kind === 'Stage' ? 'Advance Stage' : 'Verify Compliance',
              icon: <Check size={13} />,
              onClick: () => handleAction(contextMenu.item, contextMenu.idx),
            },
            {
              label: 'Copy Application ID',
              icon: <Copy size={13} />,
              onClick: () => {
                const text = contextMenu.item.appId ?? `#${contextMenu.item.recordId}`;
                navigator.clipboard?.writeText(text);
              },
            },
            {
              label: `Filter by "${contextMenu.item.inst.slice(0, 20)}…"`,
              onClick: () => setInstFilter(contextMenu.item.inst),
            },
            { separator: true, label: '', onClick: () => {} },
            {
              label: 'Return Application',
              danger: true,
              onClick: () => {
                if (contextMenu.item.appId) handleReturn(contextMenu.item.appId, 'Deficiency');
              },
            },
          ]}
        />
      )}

      {/* App Drawer */}
      {selectedApp && (
        <AppDrawer
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onAdvance={onAdvance}
          onReturn={handleReturn}
          actionLoading={actionLoading}
          getDaysLeft={getDaysLeft}
          log={LOG}
          hasPrev={selectedAppIdx > 0}
          hasNext={selectedAppIdx < apps.length - 1}
          onPrev={() => {
            if (selectedAppIdx > 0) {
              setSelectedApp(apps[selectedAppIdx - 1]);
              setSelectedAppIdx(selectedAppIdx - 1);
            }
          }}
          onNext={() => {
            if (selectedAppIdx < apps.length - 1) {
              setSelectedApp(apps[selectedAppIdx + 1]);
              setSelectedAppIdx(selectedAppIdx + 1);
            }
          }}
        />
      )}
    </div>
  );
}

// ── Chart data builder ────────────────────────────────────────────────────────
function buildChartData(items: UrgencyItem[], days: number): AreaPoint[] {
  const counts: Record<number, number> = {};
  for (let i = 0; i < days; i++) counts[i] = 0;
  items.forEach(item => {
    if (item.d >= 0 && item.d < days) counts[Math.floor(item.d)] = (counts[Math.floor(item.d)] || 0) + 1;
  });
  const today = new Date();
  return Array.from({ length: days }, (_, i) => ({
    day: i,
    date: new Date(today.getTime() + i * 86400000),
    count: counts[i] || 0,
  }));
}

// ── OverviewPage ──────────────────────────────────────────────────────────────
export function OverviewPage() {
  const {
    apps, evcs, ul, dl, urgencyItems,
    getDaysLeftForApp, aphRules,
    handleAdvance, handleReturn, handleUndertakingAction, handleDocumentAction,
    handleSweep, actionLoading, LOG,
    setPage, setPendingAppsFilter,
    dataReady, showToast,
  } = useApp();

  const [kpiFilter, setKpiFilter] = useState<string | null>(null);
  const [heatFilter, setHeatFilter] = useState<HeatSelection | null>(null);
  const [donutStage, setDonutStage] = useState<string | null>(null);
  const [brushFilter, setBrushFilter] = useState<BrushRange | null>(null);
  const [hoveredTarget, setHoveredTarget] = useState<any>(null);
  const [chartDays, setChartDays] = useState<15 | 30 | 90>(30);
  const [sweepRunning, setSweepRunning] = useState(false);
  const [sweepResult, setSweepResult] = useState<SweepResult | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const openApps = openApplications(apps);
  const stageOv  = stageOverdue(apps, getDaysLeftForApp);
  const evcDue   = evcItems(evcs);
  const unRisk   = undertakingsAtRisk(ul);
  const docExp   = docsExpiring(dl);

  const kpiContext = useMemo(() => {
    const l3 = urgencyItems.filter(x => alertLevel(x.d) === 'L3').length;
    const l2 = urgencyItems.filter(x => alertLevel(x.d) === 'L2').length;
    return l3 > 0 || l2 > 0 ? `${l3} at L3 · ${l2} at L2` : 'Within SLA';
  }, [urgencyItems]);

  const chartData = useMemo(() => buildChartData(urgencyItems, chartDays), [urgencyItems, chartDays]);

  const donutSlices = useMemo<DonutSlice[]>(() => {
    const scrutiny = apps.filter(a => getStage(a) === 'Scrutiny').length;
    const evc      = apps.filter(a => getStage(a) === 'EVC').length;
    const sac      = apps.filter(a => getStage(a) === 'SAC/SHC').length;
    return [
      { key: 'Scrutiny', label: 'Scrutiny', value: scrutiny, color: 'var(--donut-1)', icon: <FileText size={12} /> },
      { key: 'EVC',      label: 'EVC',      value: evc,      color: 'var(--donut-2)', icon: <Users size={12} /> },
      { key: 'SAC/SHC',  label: 'SAC/SHC',  value: sac,      color: 'var(--donut-3)', icon: <CheckCircle size={12} /> },
    ];
  }, [apps]);

  const scrollToTable = useCallback(() => {
    setTimeout(() => tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }, []);

  const handleKpiClick = useCallback((key: string) => {
    setKpiFilter(f => f === key ? null : key);
    setHeatFilter(null);
    setDonutStage(null);
    setBrushFilter(null);
    scrollToTable();
  }, [scrollToTable]);

  const handleHeatSelect = useCallback((sel: HeatSelection | null) => {
    setHeatFilter(sel);
    if (sel) { setKpiFilter(null); setBrushFilter(null); scrollToTable(); }
  }, [scrollToTable]);

  const handleDonutSelect = useCallback((key: string) => {
    setDonutStage(d => d === key ? null : key);
    setKpiFilter(null);
    setBrushFilter(null);
    scrollToTable();
  }, [scrollToTable]);

  const handleBrushSelect = useCallback((range: BrushRange | null) => {
    setBrushFilter(range);
    if (range) {
      setKpiFilter(null);
      setHeatFilter(null);
      setDonutStage(null);
      scrollToTable();
    }
  }, [scrollToTable]);

  const runSweep = async () => {
    setSweepRunning(true);
    const t0 = Date.now();
    await handleSweep();
    const elapsed = Date.now() - t0;
    if (elapsed < 800) await new Promise(r => setTimeout(r, 800 - elapsed));
    const result: SweepResult = {
      l3: urgencyItems.filter(x => alertLevel(x.d) === 'L3'),
      l2: urgencyItems.filter(x => alertLevel(x.d) === 'L2'),
      l1: urgencyItems.filter(x => alertLevel(x.d) === 'L1'),
    };
    setSweepResult(result);
    setSweepRunning(false);
  };

  const navigateApps = useCallback((stage?: string) => {
    if (stage) setPendingAppsFilter({ stage });
    setPage('ap');
  }, [setPage, setPendingAppsFilter]);

  const navigateEs = useCallback(() => setPage('es'), [setPage]);

  if (!dataReady) {
    return (
      <div className="page-content">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="panel" style={{ height: 140 }}>
              <div style={{ padding: 24 }}>
                <div className="skeleton" style={{ height: 16, width: '40%', marginBottom: 12 }} />
                <div className="skeleton" style={{ height: 12, width: '70%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Linked view hover calculations
  const heatmapHighlighted = hoveredTarget?.type === 'row'
    ? { region: hoveredTarget.region, day: hoveredTarget.day < 0 ? 'overdue' as const : hoveredTarget.day }
    : hoveredTarget?.type === 'heat'
      ? { region: hoveredTarget.region, day: hoveredTarget.day }
      : null;

  const donutHighlighted = hoveredTarget?.type === 'row'
    ? hoveredTarget.stage
    : hoveredTarget?.type === 'stage'
      ? hoveredTarget.value
      : null;

  const chartHighlightedDay = hoveredTarget?.type === 'row'
    ? hoveredTarget.day
    : hoveredTarget?.type === 'day'
      ? hoveredTarget.day
      : null;

  return (
    <div className="page-content">
      <HintChip id="overview-cross-filtering">
        <span><strong>Pro-Tip:</strong> Click any KPI cell, Donut slice, or Heatmap block to filter the Attention Queue below. Keyboard shortcut: <kbd>?</kbd> for cheat-sheet, <kbd>⌘K</kbd> for commands.</span>
      </HintChip>

      {/* Row 1: KPI + Heatmap */}
      <div className="overview-top">
        <div className="panel kpi-panel">
          <div className="panel-float-menu">
            <CardMenu items={[
              { label: 'Run alert sweep', onClick: runSweep, disabled: sweepRunning },
              { label: 'Export CSV', onClick: async () => { showToast('Export', 'Use the Applications page for full export', 'info'); } },
            ]} />
          </div>
          <div className="kpi-grid">
            <KpiCell icon={FileText}      label="Open applications"    value={openApps} context={kpiContext}                     active={kpiFilter === 'open'}   onClick={() => handleKpiClick('open')}   helpText={METRIC_HELP.openApplications} />
            <KpiCell icon={Clock}         label="Stage overdue"        value={stageOv}  context={`Scrutiny ${aphRules.Scrutiny}d · EVC ${aphRules.EVC}d`} active={kpiFilter === 'overdue'} onClick={() => handleKpiClick('overdue')} helpText={METRIC_HELP.stageOverdue} />
            <KpiCell icon={Users}         label="EVCs due ≤ 15d"       value={evcDue}   context="Expert visits at risk"          active={kpiFilter === 'evc'}    onClick={() => handleKpiClick('evc')}    helpText={METRIC_HELP.evcItems} />
            <KpiCell icon={ClipboardCheck} label="Undertakings at risk" value={unRisk}  context="Pending and due soon"          active={kpiFilter === 'un'}     onClick={() => handleKpiClick('un')}     helpText={METRIC_HELP.undertakingsAtRisk} />
            <KpiCell icon={FileSignature} label="Docs expiring"        value={docExp}   context="Leases due ≤ 15d"              active={kpiFilter === 'docs'}   onClick={() => handleKpiClick('docs')}   helpText={METRIC_HELP.docsExpiring} />
          </div>
        </div>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span className="panel-title">Deadline load</span>
            <CardMenu items={[{ label: 'Clear filter', onClick: () => setHeatFilter(null) }]} />
          </div>
          <Heatmap
            items={urgencyItems}
            active={heatFilter}
            onSelect={handleHeatSelect}
            highlighted={heatmapHighlighted}
            onHover={sel => setHoveredTarget(sel ? { type: 'heat', region: sel.region, day: sel.day } : null)}
          />
        </div>
      </div>

      {/* Row 2: Area chart + Donut */}
      <div className="overview-grid" style={{ gridTemplateColumns: '62fr 38fr' }}>
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Items due per day</span>
            <CardMenu items={[{ label: 'View escalations', onClick: navigateEs }]} />
          </div>
          <div style={{ padding: '16px 16px 0' }}>
            <AreaChart
              data={chartData}
              height={240}
              highlightedDay={chartHighlightedDay}
              onHoverDay={day => setHoveredTarget(day !== null ? { type: 'day', day } : null)}
              selectedRange={brushFilter ? { startDay: brushFilter.startDay, endDay: brushFilter.endDay } : null}
              onBrushSelect={handleBrushSelect}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {([15, 30, 90] as const).map(d => (
                <button
                  key={d}
                  className={`btn btn-xs ${chartDays === d ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setChartDays(d)}
                  aria-pressed={chartDays === d}
                >
                  {d}d
                </button>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={navigateEs}>
              View escalations <ChevronRight size={13} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Applications by stage</span>
            <CardMenu items={[{ label: 'View all applications', onClick: () => navigateApps() }]} />
          </div>
          <div style={{ padding: '16px 20px 20px' }}>
            <Donut
              slices={donutSlices}
              total={openApps}
              active={donutStage}
              onSelect={handleDonutSelect}
              highlightedKey={donutHighlighted}
              onHover={key => setHoveredTarget(key ? { type: 'stage', value: key } : null)}
            />
          </div>
        </div>
      </div>

      {/* Row 3: Attention table */}
      <div ref={tableRef}>
        <AttentionTable
          items={urgencyItems}
          heatFilter={heatFilter}
          donutStage={donutStage}
          kpiFilter={kpiFilter}
          brushFilter={brushFilter}
          hoveredTarget={hoveredTarget}
          onHoverRow={row => setHoveredTarget(row ? { type: 'row', ...row } : null)}
          onNavigateApps={navigateApps}
          onNavigateEs={navigateEs}
          onAdvance={handleAdvance}
          onUndertakingAction={handleUndertakingAction}
          onDocumentAction={handleDocumentAction}
          actionLoading={actionLoading}
          getDaysLeft={getDaysLeftForApp}
          apps={apps}
          LOG={LOG}
          handleReturn={handleReturn}
          onClearHeat={() => setHeatFilter(null)}
          onClearDonut={() => setDonutStage(null)}
          onClearKpi={() => setKpiFilter(null)}
          onClearBrush={() => setBrushFilter(null)}
        />
      </div>

      {/* Sweep spinner */}
      {sweepRunning && (
        <div className="modal-overlay" aria-label="Running alert sweep" aria-live="polite">
          <div style={{
            background: 'var(--surface)', borderRadius: 16, padding: '32px 40px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
            border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
          }}>
            <RefreshCw size={32} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} aria-hidden="true" />
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Running alert sweep…</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Scanning {urgencyItems.length} items</div>
          </div>
        </div>
      )}

      {/* Sweep result modal */}
      {sweepResult && !sweepRunning && (
        <SweepModal
          result={sweepResult}
          onClose={() => setSweepResult(null)}
          onViewAudit={() => { setSweepResult(null); setPage('lg'); }}
        />
      )}
    </div>
  );
}
