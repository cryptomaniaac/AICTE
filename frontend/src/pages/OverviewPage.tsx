import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  FileText, Clock, Users, ClipboardCheck, FileSignature,
  ArrowRight, RotateCcw, Bell, CheckCircle, X, AlertTriangle,
  ChevronRight, RefreshCw,
} from 'lucide-react';
import { useApp, getStage, alertLevel, formatDays, ROUTES } from '../context/AppContext';
import {
  openApplications, stageOverdue, evcItems,
  undertakingsAtRisk, docsExpiring,
  needsAttentionItems, METRIC_HELP,
} from '../lib/metrics';
import { AreaChart } from '../components/AreaChart';
import type { AreaPoint } from '../components/AreaChart';
import { Heatmap } from '../components/Heatmap';
import type { HeatSelection } from '../components/Heatmap';
import { Donut } from '../components/Donut';
import type { DonutSlice } from '../components/Donut';
import { CardMenu } from '../components/shared/CardMenu';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
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
}: {
  app: AppRecord; onClose: () => void;
  onAdvance: (id: string) => Promise<void>;
  onReturn: (id: string, reason: string) => Promise<void>;
  actionLoading: string | null;
  getDaysLeft: (a: AppRecord) => number;
  log: { t: string; who: string; x: string }[];
}) {
  const [reason, setReason] = useState('Deficiency');
  const [showReturnConfirm, setShowReturnConfirm] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const stages = ROUTES[app.rt] || [];
  const isLast = app.i === stages.length - 1;
  const currentStage = getStage(app);
  const daysLeft = getDaysLeft(app);
  const isAdvancing = actionLoading === `adv-${app.id}`;
  const isReturning = actionLoading === `ret-${app.id}`;
  const appLogs = log.filter(l => l.x.includes(app.id)).slice(0, 5);
  const lvl = alertLevel(daysLeft);

  useEffect(() => {
    setTimeout(() => closeRef.current?.focus(), 50);
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} aria-hidden="true" />
      <div className="drawer" role="dialog" aria-modal="true" aria-labelledby="ov-drawer-title">
        <div className="drawer-header">
          <span className="drawer-title" id="ov-drawer-title">{app.id} · {app.inst}</span>
          <button ref={closeRef} className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </div>
        <div className="drawer-body">
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
          <div style={{ marginBottom: 20 }}>
            <div className="form-label" style={{ marginBottom: 8 }}>Route Progress</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {stages.map((s, j) => (
                <span key={j} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`stage-chip${j < app.i ? ' done' : j === app.i ? ' active' : ''}`}>{s}</span>
                  {j < stages.length - 1 && <ArrowRight size={12} style={{ color: 'var(--muted-2)' }} />}
                </span>
              ))}
            </div>
          </div>
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 20 }}>
            <div className="form-label" style={{ marginBottom: 10 }}>Actions</div>
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
          <div className="form-label" style={{ marginBottom: 8 }}>Recent History</div>
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
  items, heatFilter, donutStage, kpiFilter,
  onNavigateApps, onNavigateEs,
  onAdvance, onUndertakingAction, onDocumentAction,
  actionLoading, getDaysLeft, apps, LOG, handleReturn,
  onClearHeat, onClearDonut, onClearKpi,
}: {
  items: UrgencyItem[];
  heatFilter: HeatSelection | null;
  donutStage: string | null;
  kpiFilter: string | null;
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
}) {
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('All');
  const [selectedApp, setSelectedApp] = useState<AppRecord | null>(null);
  const [sortCol, setSortCol] = useState<'level' | 'inst' | 'timeline'>('level');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

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
    if (levelFilter !== 'All') list = list.filter(x => alertLevel(x.d) === levelFilter);
    list.sort((a, b) => {
      let v = 0;
      if (sortCol === 'inst') v = a.inst.localeCompare(b.inst);
      else v = a.d - b.d;
      return sortDir === 'asc' ? v : -v;
    });
    return list;
  }, [sorted, heatFilter, donutStage, kpiFilter, levelFilter, sortCol, sortDir]);

  const hasFilter = !!(heatFilter || donutStage || kpiFilter || levelFilter !== 'All');
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
      if (a) setSelectedApp(a);
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

  return (
    <div className="panel" style={{ marginTop: 20 }}>
      <div className="panel-header">
        <span className="panel-title">
          <AlertTriangle size={16} style={{ color: 'var(--amber)' }} aria-hidden="true" />
          Needs attention today
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {filtered.length < sorted.length && (
            <span className="tabnum" style={{ fontSize: 12, color: 'var(--muted)' }}>
              {filtered.length} of {sorted.length}
            </span>
          )}
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
          <button className="active-filters-clear" onClick={() => {
            onClearHeat(); onClearDonut(); onClearKpi(); setLevelFilter('All');
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

      <div className="table-wrap">
        <table className="attention-table" role="grid">
          <thead>
            <tr>
              <th style={{ width: 90 }}>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit', fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}
                  onClick={() => handleSort('level')}
                  aria-sort={sortCol === 'level' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  Level <SortArrow col="level" />
                </button>
              </th>
              <th>Item</th>
              <th style={{ width: 180 }}>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit', fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}
                  onClick={() => handleSort('inst')}
                  aria-sort={sortCol === 'inst' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  Institution <SortArrow col="inst" />
                </button>
              </th>
              <th style={{ width: 80 }}>Region</th>
              <th style={{ width: 110 }}>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit', fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}
                  onClick={() => handleSort('timeline')}
                  aria-sort={sortCol === 'timeline' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  Timeline <SortArrow col="timeline" />
                </button>
              </th>
              <th style={{ width: 90 }} className="cell-action">Action</th>
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 13 }}>
                  {hasFilter ? 'No items match the current filters.' : 'Nothing needs attention right now.'}
                </td>
              </tr>
            ) : (
              displayed.map((item, idx) => {
                const lvl = alertLevel(item.d);
                const levelChipClass = lvl === 'L3' ? 'chip-l3' : lvl === 'L2' ? 'chip-l2' : lvl === 'L1' ? 'chip-l1' : 'chip-grey';
                const timelineChipClass = levelChipClass;
                const actionLabel = item.kind === 'Stage' ? 'Advance' : item.kind === 'EVC' ? 'Open' : 'Verify';
                const isLoading = actionLoading === `adv-${item.appId}` || actionLoading === `un-${item.recordId}` || actionLoading === `dc-${item.recordId}`;
                return (
                  <tr
                    key={`${item.kind}-${item.appId ?? item.recordId}-${idx}`}
                    className="clickable"
                    onClick={() => handleAction(item, idx)}
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleAction(item, idx); } }}
                    aria-label={`${item.inst} — ${item.kind} — ${formatDays(item.d)}`}
                  >
                    <td><span className={`chip ${levelChipClass}`}>{lvl === 'none' ? '—' : lvl}</span></td>
                    <td>
                      <span className="cell-title">
                        {item.kind === 'Stage' ? `${item.stage ?? ''} review`
                          : item.kind === 'EVC' ? 'Expert visit due'
                          : item.kind === 'Undertaking' ? 'Undertaking pending'
                          : 'Document expiring'}
                      </span>
                      <span className="cell-sub">{item.kind} · {item.appId ?? `#${item.recordId}`}</span>
                    </td>
                    <td><span className="cell-inst" title={item.inst}>{item.inst}</span></td>
                    <td><span className="chip chip-grey">{item.reg}</span></td>
                    <td><span className={`chip ${timelineChipClass}`}>{formatDays(item.d)}</span></td>
                    <td className="cell-action" onClick={e => e.stopPropagation()}>
                      <button
                        className="btn btn-secondary btn-xs"
                        onClick={() => handleAction(item, idx)}
                        disabled={isLoading}
                        aria-label={`${actionLabel} — ${item.inst}`}
                      >
                        {isLoading ? '…' : actionLabel}
                      </button>
                    </td>
                  </tr>
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

      {selectedApp && (
        <AppDrawer
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onAdvance={onAdvance}
          onReturn={handleReturn}
          actionLoading={actionLoading}
          getDaysLeft={getDaysLeft}
          log={LOG}
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
    scrollToTable();
  }, [scrollToTable]);

  const handleHeatSelect = useCallback((sel: HeatSelection | null) => {
    setHeatFilter(sel);
    if (sel) { setKpiFilter(null); scrollToTable(); }
  }, [scrollToTable]);

  const handleDonutSelect = useCallback((key: string) => {
    setDonutStage(d => d === key ? null : key);
    setKpiFilter(null);
    scrollToTable();
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

  return (
    <div className="page-content">
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
          <Heatmap items={urgencyItems} active={heatFilter} onSelect={handleHeatSelect} />
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
            <AreaChart data={chartData} height={240} />
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
