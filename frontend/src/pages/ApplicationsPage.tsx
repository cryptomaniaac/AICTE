import { useState, useMemo, useEffect, useRef } from 'react';
import {
  X, RotateCcw, Info, List, Kanban,
  ChevronLeft, ChevronRight, Plus, Download, Search,
} from 'lucide-react';

import { useApp, getStage, alertLevel, formatDays, ROUTES } from '../context/AppContext';
import { StatusChip, LevelChip, StageChips } from '../components/shared/StatusChip';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import type { AppRecord } from '../types';

interface Filters {
  region: string;
  stage: string;
  route: string;
  overdueOnly: boolean;
}

const BOARD_COLUMNS = ['Scrutiny', 'EVC', 'SAC/SHC'] as const;

function AppDrawer({
  app,
  onClose,
  onAdvance,
  onReturn,
  actionLoading,
  getDaysLeft,
  log,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  app: AppRecord;
  onClose: () => void;
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
  const lvl = alertLevel(daysLeft);

  const appLogs = log.filter(l => l.x.includes(app.id));

  useEffect(() => {
    setTimeout(() => closeRef.current?.focus(), 50);
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.key === 'j' || e.key === 'ArrowDown') && onNext && hasNext) onNext();
      if ((e.key === 'k' || e.key === 'ArrowUp') && onPrev && hasPrev) onPrev();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
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
      <div className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <div className="drawer-handle" aria-hidden="true" />
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="drawer-title" id="drawer-title">
              {app.id} · {app.inst}
            </span>
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
          <button ref={closeRef} className="icon-btn" onClick={onClose} aria-label="Close application drawer">
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
              {/* Meta */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Institution', value: app.inst },
                  { label: 'Region', value: <span className="chip chip-grey">{app.reg}</span> },
                  { label: 'Route Type', value: <code style={{ fontFamily: 'monospace', fontWeight: 700 }}>{app.rt}</code> },
                  { label: 'Current Stage', value: <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{currentStage || '—'}</span> },
                  { label: 'Escalation', value: <span className={`chip chip-${lvl === 'L3' ? 'l3' : lvl === 'L2' ? 'l2' : lvl === 'L1' ? 'l1' : 'grey'}`}>{lvl === 'none' ? 'OK' : lvl}</span> },
                  { label: 'Days in Stage', value: <span className="tabnum">{app.age}d</span> },
                  { label: 'SLA Status', value: <StatusChip days={daysLeft} /> },
                  { label: 'SLA Remaining', value: <span className="tabnum">{formatDays(daysLeft)}</span> },
                ].map(item => (
                  <div key={item.label}>
                    <div className="form-label" style={{ marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Advance / Return */}
              <div
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: 14,
                  marginBottom: 20,
                }}
              >
                <div className="form-label" style={{ marginBottom: 10 }}>Stage Actions</div>
                <div style={{ marginBottom: 12 }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => onAdvance(app.id)}
                    disabled={isAdvancing || isReturning}
                    aria-label={isLast ? 'Forward to competent authority' : `Complete ${currentStage} stage`}
                    title={isLast ? 'Final stage — forwards to competent authority for decision' : undefined}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {isAdvancing
                      ? 'Processing…'
                      : isLast
                      ? 'Forward to Competent Authority'
                      : `Complete ${currentStage} Stage`
                    }
                  </button>
                  {isLast && (
                    <div className="alert alert-info" style={{ marginTop: 8, fontSize: 12 }}>
                      <Info size={13} aria-hidden="true" style={{ flexShrink: 0 }} />
                      <span>This is the final stage. Completing it forwards the file for the competent authority's decision.</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    className="form-select"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    style={{ flex: 1 }}
                    aria-label="Return reason"
                  >
                    <option>Deficiency</option>
                    <option>Clarification</option>
                    <option>Further verification</option>
                  </select>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowReturnConfirm(true)}
                    disabled={isAdvancing || isReturning}
                    aria-label={`Return: ${reason}`}
                  >
                    <RotateCcw size={13} aria-hidden="true" />
                    Return
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
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>No history entries for this application.</p>
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
        onConfirm={async () => {
          setShowReturnConfirm(false);
          await onReturn(app.id, reason);
        }}
        title="Return Application"
        message={
          <>
            Return <strong>{app.id}</strong> ({app.inst}) for <strong>{reason}</strong>?
            {' '}This will move the application back and log the reason in the audit trail.
          </>
        }
        confirmLabel="Return Application"
        confirmVariant="danger"
        loading={isReturning}
      />
    </>
  );
}

export function ApplicationsPage() {
  const {
    apps, getDaysLeftForApp, handleAdvance, handleReturn, actionLoading, LOG, searchQuery,
    pendingAppsFilter, setPendingAppsFilter,
    pendingDrawerAppId, setPendingDrawerAppId,
    showToast, handleExportCsv,
  } = useApp();

  const [localSearch, setLocalSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'board'>(() => {
    try {
      return (localStorage.getItem('aicte_apps_view') as any) || 'list';
    } catch {
      return 'list';
    }
  });

  const [filters, setFilters] = useState<Filters>({
    region: '', stage: '', route: '', overdueOnly: false,
  });

  const [selectedApp, setSelectedApp] = useState<AppRecord | null>(null);
  const [selectedAppIdx, setSelectedAppIdx] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'age' | 'id' | 'inst'>('age');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Drag and Drop state
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [shakingId, setShakingId] = useState<string | null>(null);
  const [pickedUpId, setPickedUpId] = useState<string | null>(null);
  const [ariaAnnouncement, setAriaAnnouncement] = useState('');

  const toggleViewMode = (mode: 'list' | 'board') => {
    setViewMode(mode);
    try {
      localStorage.setItem('aicte_apps_view', mode);
    } catch {
      // ignore
    }
  };

  // Deep-linked filters (e.g. pipeline row → Applications in that stage)
  useEffect(() => {
    if (!pendingAppsFilter) return;
    setFilters(f => ({ ...f, ...pendingAppsFilter }));
    setPendingAppsFilter(null);
  }, [pendingAppsFilter, setPendingAppsFilter]);

  // Deep-linked drawer open (e.g. attention table row / EVC "Open")
  useEffect(() => {
    if (!pendingDrawerAppId) return;
    const target = apps.find(a => a.id === pendingDrawerAppId);
    if (target) {
      setSelectedApp(target);
      const idx = apps.findIndex(a => a.id === target.id);
      setSelectedAppIdx(idx >= 0 ? idx : 0);
    }
    setPendingDrawerAppId(null);
  }, [pendingDrawerAppId, apps, setPendingDrawerAppId]);

  const handleSort = (col: 'age' | 'id' | 'inst') => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const filtered = useMemo(() => {
    let list = [...apps];
    const activeSearch = localSearch || searchQuery;

    // Search filter
    if (activeSearch.trim()) {
      const q = activeSearch.toLowerCase();
      list = list.filter(a =>
        a.inst.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q)
      );
    }


    if (filters.region) list = list.filter(a => a.reg === filters.region);
    if (filters.stage)  list = list.filter(a => getStage(a) === filters.stage);
    if (filters.route)  list = list.filter(a => a.rt === filters.route);
    if (filters.overdueOnly) list = list.filter(a => getDaysLeftForApp(a) < 0);

    list.sort((a, b) => {
      let v = 0;
      if (sortBy === 'age') v = a.age - b.age;
      else if (sortBy === 'id') v = a.id.localeCompare(b.id);
      else v = a.inst.localeCompare(b.inst);
      return sortDir === 'asc' ? v : -v;
    });

    return list;
  }, [apps, filters, searchQuery, sortBy, sortDir, getDaysLeftForApp]);

  // Drag and Drop validation and execution
  const getNextStage = (app: AppRecord): string | null => {
    const stages = ROUTES[app.rt] || [];
    if (app.i < stages.length - 1) return stages[app.i + 1];
    return null;
  };

  const executeDrop = async (appId: string, targetCol: string) => {
    const app = apps.find(a => a.id === appId);
    if (!app) return;
    const current = getStage(app);
    const next = getNextStage(app);

    if (targetCol === current) {
      return; // dropped in same column
    }

    if (targetCol !== next) {
      // Invalid drop — trigger shake and toast
      setShakingId(appId);
      setTimeout(() => setShakingId(null), 500);
      showToast(
        'Invalid Step',
        `${appId} cannot skip directly to ${targetCol}. It must proceed to ${next || 'Competent Authority'} sequentially.`,
        'warn'
      );
      setAriaAnnouncement(`Cannot move ${appId} to ${targetCol}. Must move to ${next}.`);
      return;
    }

    // Valid drop! Advance application
    await handleAdvance(app.id);
    showToast('Application Advanced', `Moved ${app.id} (${app.inst}) to ${targetCol}`, 'success', {
      duration: 6000,
      undoLabel: 'Undo',
      onUndo: async () => {
        await handleReturn(app.id, 'Workflow Undo');
      },
    });
    setAriaAnnouncement(`Successfully advanced ${app.id} to ${targetCol}`);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent, app: AppRecord) => {
    if (e.key === ' ') {
      e.preventDefault();
      if (!pickedUpId) {
        setPickedUpId(app.id);
        setAriaAnnouncement(`Picked up ${app.id}. Use left/right arrow keys to select target stage, Space to drop, Escape to cancel.`);
      } else if (pickedUpId === app.id) {
        setPickedUpId(null);
        setAriaAnnouncement('Cancelled card pickup.');
      }
    } else if (e.key === 'Escape') {
      if (pickedUpId) {
        setPickedUpId(null);
        setAriaAnnouncement('Cancelled card pickup.');
      }
    } else if (pickedUpId === app.id && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      e.preventDefault();
      const current = getStage(app) || 'Scrutiny';
      const curIdx = BOARD_COLUMNS.indexOf(current as any);
      const nextIdx = e.key === 'ArrowRight' ? curIdx + 1 : curIdx - 1;
      if (nextIdx >= 0 && nextIdx < BOARD_COLUMNS.length) {
        const target = BOARD_COLUMNS[nextIdx];
        executeDrop(app.id, target);
        setPickedUpId(null);
      }
    }
  };

  const SortIcon = ({ col }: { col: string }) => (
    <span aria-hidden="true" style={{ opacity: sortBy === col ? 1 : .3 }}>
      {sortBy === col && sortDir === 'asc' ? ' ↑' : ' ↓'}
    </span>
  );

  return (
    <div className="page-content">
      {/* Aria-live region for drag and drop accessibility */}
      <div role="status" aria-live="polite" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
        {ariaAnnouncement}
      </div>

      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Applications</h1>
          <p>Automatic routing · {apps.length} total · {filtered.length} shown</p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleExportCsv}
            disabled={actionLoading === 'export-csv'}
            title="Download CSV export of pendency summary"
            style={{ gap: 5 }}
          >
            <Download size={13} aria-hidden="true" />
            {actionLoading === 'export-csv' ? 'Exporting…' : 'Export Pendency CSV'}
          </button>

          {/* View Mode Segmented Switch (List | Board) */}
          <div style={{ display: 'inline-flex', background: 'var(--surface-2)', padding: 3, borderRadius: 8, border: '1px solid var(--border)' }}>
            <button
              className={`btn btn-xs ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => toggleViewMode('list')}
              style={{ borderRadius: 6, gap: 5 }}
              aria-pressed={viewMode === 'list'}
            >
              <List size={13} /> List
            </button>
            <button
              className={`btn btn-xs ${viewMode === 'board' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => toggleViewMode('board')}
              style={{ borderRadius: 6, gap: 5 }}
              aria-pressed={viewMode === 'board'}
            >
              <Kanban size={13} /> Board
            </button>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 14 }}>
        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              className="filter-custom-select"
              value={filters.region}
              onChange={e => setFilters(f => ({ ...f, region: e.target.value }))}
              aria-label="Filter by region"
            >
              <option value="">All Regions</option>
              {['North', 'South', 'East', 'West'].map(r => (
                <option key={r} value={r}>{r} Region</option>
              ))}
            </select>

            <select
              className="filter-custom-select"
              value={filters.stage}
              onChange={e => setFilters(f => ({ ...f, stage: e.target.value }))}
              aria-label="Filter by stage"
            >
              <option value="">All Stages</option>
              {['Scrutiny', 'EVC', 'SAC/SHC'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              className="filter-custom-select"
              value={filters.route}
              onChange={e => setFilters(f => ({ ...f, route: e.target.value }))}
              aria-label="Filter by route type"
            >
              <option value="">All Routes</option>
              {['S', 'SE', 'ES', 'E', 'SES'].map(r => (
                <option key={r} value={r}>Route {r}</option>
              ))}
            </select>

            <button
              type="button"
              className={`severity-pill ${filters.overdueOnly ? 'active' : ''}`}
              onClick={() => setFilters(f => ({ ...f, overdueOnly: !f.overdueOnly }))}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <span>Overdue Only</span>
            </button>

            {(filters.region || filters.stage || filters.route || filters.overdueOnly || localSearch) && (
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => {
                  setFilters({ region: '', stage: '', route: '', overdueOnly: false });
                  setLocalSearch('');
                }}
                style={{ gap: 4 }}
              >
                <RotateCcw size={11} /> Reset
              </button>
            )}
          </div>

          <div className="filter-search-box" style={{ width: 240 }}>
            <Search size={14} className="filter-search-icon" />
            <input
              type="text"
              placeholder="Search ID or Institute…"
              className="filter-search-input"
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
            />
            {localSearch && (
              <button
                type="button"
                className="filter-search-clear"
                onClick={() => setLocalSearch('')}
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="panel">


        {/* Content: List or Board */}
        {viewMode === 'board' ? (
          <div className="board-container">
            {BOARD_COLUMNS.map(colStage => {
              const colApps = filtered.filter(a => getStage(a) === colStage);
              const isOver = dragOverCol === colStage;

              return (
                <div
                  key={colStage}
                  className={`board-column ${isOver ? 'drag-over' : ''}`}
                  onDragOver={e => {
                    e.preventDefault();
                    setDragOverCol(colStage);
                  }}
                  onDragLeave={() => setDragOverCol(null)}
                  onDrop={e => {
                    e.preventDefault();
                    setDragOverCol(null);
                    const appId = e.dataTransfer.getData('text/plain') || draggedAppId;
                    if (appId) executeDrop(appId, colStage);
                    setDraggedAppId(null);
                  }}
                >
                  <div className="board-col-header">
                    <span>{colStage} Stage</span>
                    <span className="board-col-count tabnum">{colApps.length}</span>
                  </div>

                  <div className="board-cards-list">
                    {colApps.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--muted)', fontSize: 12.5 }}>
                        No applications in {colStage}
                      </div>
                    ) : (
                      colApps.map(a => {
                        const d = getDaysLeftForApp(a);
                        const isDragging = draggedAppId === a.id;
                        const isShaking = shakingId === a.id;
                        const isPickedUp = pickedUpId === a.id;

                        return (
                          <div
                            key={a.id}
                            className={`board-card ${isDragging ? 'dragging' : ''} ${isShaking ? 'shake' : ''} ${isPickedUp ? 'drop-snap' : ''}`}
                            draggable={true}
                            onDragStart={e => {
                              e.dataTransfer.setData('text/plain', a.id);
                              setDraggedAppId(a.id);
                            }}
                            onDragEnd={() => {
                              setDraggedAppId(null);
                              setDragOverCol(null);
                            }}
                            onClick={() => {
                              setSelectedApp(a);
                              const idx = apps.findIndex(x => x.id === a.id);
                              setSelectedAppIdx(idx >= 0 ? idx : 0);
                            }}
                            tabIndex={0}
                            onKeyDown={e => handleCardKeyDown(e, a)}
                            style={{
                              outline: isPickedUp ? '2px solid var(--primary)' : undefined,
                              boxShadow: isPickedUp ? '0 0 12px var(--primary-100)' : undefined,
                            }}
                            aria-label={`${a.id}: ${a.inst}. ${a.age} days in stage. Press space to pick up and arrow keys to move.`}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: 'var(--primary)' }}>
                                {a.id}
                              </span>
                              <span className="chip chip-grey" style={{ fontSize: 10 }}>{a.reg}</span>
                            </div>

                            <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)', marginBottom: 8, lineHeight: 1.4 }}>
                              {a.inst}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                              <span className="tabnum" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                                {a.age}d in stage
                              </span>
                              <StatusChip days={d} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><FileIcon /></div>
            <h3>No applications match your filters</h3>
            <p>Try adjusting the region, stage, or route filters above.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', font: 'inherit', padding: 0 }} onClick={() => handleSort('id')}>
                      App ID <SortIcon col="id" />
                    </button>
                  </th>
                  <th>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', font: 'inherit', padding: 0 }} onClick={() => handleSort('inst')}>
                      Institution <SortIcon col="inst" />
                    </button>
                  </th>
                  <th>Stage</th>
                  <th>Route</th>
                  <th>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', font: 'inherit', padding: 0 }} onClick={() => handleSort('age')}>
                      Days in Stage <SortIcon col="age" />
                    </button>
                  </th>
                  <th>SLA Status</th>
                  <th>Escalation</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => {
                  const d = getDaysLeftForApp(a);
                  return (
                    <tr
                      key={a.id}
                      className="clickable"
                      onClick={() => {
                        setSelectedApp(a);
                        const idx = apps.findIndex(x => x.id === a.id);
                        setSelectedAppIdx(idx >= 0 ? idx : 0);
                      }}
                      aria-label={`Open ${a.id} — ${a.inst}`}
                    >
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>{a.id}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--text)' }}>{a.inst}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{a.reg}</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{getStage(a) || '—'}</span>
                      </td>
                      <td>
                        <StageChips route={a.rt} currentIndex={a.i} routes={ROUTES} />
                      </td>
                      <td className="tabnum">{a.age}d</td>
                      <td><StatusChip days={d} /></td>
                      <td><LevelChip days={d} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer */}
      {selectedApp && (
        <AppDrawer
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onAdvance={handleAdvance}
          onReturn={handleReturn}
          actionLoading={actionLoading}
          getDaysLeft={getDaysLeftForApp}
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

      {/* Note */}
      <p style={{ marginTop: 14, fontSize: 12, color: 'var(--muted)' }}>
        Completing a stage moves the file to the next prescribed stage. The final stage forwards it to the competent authority. Returns are logged with a reason in the audit trail.
      </p>
    </div>
  );
}

function FileIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}
