import { useState, useMemo, useEffect, useRef, Fragment } from 'react';
import { X, ArrowRight, RotateCcw, Info } from 'lucide-react';
import { useApp, getStage, ROUTES } from '../context/AppContext';
import { StatusChip, LevelChip, StageChips } from '../components/shared/StatusChip';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import type { AppRecord } from '../types';

interface Filters {
  region: string;
  stage: string;
  route: string;
  overdueOnly: boolean;
}

function AppDrawer({
  app,
  onClose,
  onAdvance,
  onReturn,
  actionLoading,
  getDaysLeft,
  log,
}: {
  app: AppRecord;
  onClose: () => void;
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

  // Filter relevant audit log entries
  const appLogs = log.filter(l => l.x.includes(app.id)).slice(0, 5);

  useEffect(() => {
    setTimeout(() => closeRef.current?.focus(), 50);
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} aria-hidden="true" />
      <div
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div className="drawer-header">
          <span className="drawer-title" id="drawer-title">
            {app.id} · {app.inst}
          </span>
          <button
            ref={closeRef}
            className="icon-btn"
            onClick={onClose}
            aria-label="Close application drawer"
          >
            <X size={15} />
          </button>
        </div>

        <div className="drawer-body">
          {/* Meta */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Institution', value: app.inst },
              { label: 'Region', value: <span className="chip chip-grey">{app.reg}</span> },
              { label: 'Route Type', value: <code style={{ fontFamily: 'monospace', fontWeight: 700 }}>{app.rt}</code> },
              { label: 'Current Stage', value: <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{currentStage || '—'}</span> },
              { label: 'Days in Stage', value: <span className="tabnum">{app.age}</span> },
              { label: 'SLA Status', value: <StatusChip days={daysLeft} /> },
            ].map(item => (
              <div key={item.label}>
                <div className="form-label" style={{ marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Route stepper */}
          <div style={{ marginBottom: 20 }}>
            <div className="form-label" style={{ marginBottom: 8 }}>Route Progress</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {stages.map((s, j) => {
                const cls = j < app.i ? 'done' : j === app.i ? 'active' : '';
                return (
                  <Fragment key={j}>
                    <span className={`stage-chip ${cls}`}>{s}</span>
                    {j < stages.length - 1 && (
                      <ArrowRight size={12} style={{ color: 'var(--muted-2)', flexShrink: 0 }} aria-hidden="true" />
                    )}
                  </Fragment>
                );
              })}
            </div>
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
            <div className="form-label" style={{ marginBottom: 10 }}>Actions</div>

            {/* Advance */}
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

            {/* Return */}
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                className="form-select"
                value={reason}
                onChange={e => setReason(e.target.value)}
                style={{ flex: 1 }}
                aria-label="Return reason"
              >
                <option value="Deficiency">Deficiency</option>
                <option value="Clarification">Clarification</option>
                <option value="Further verification">Further verification</option>
              </select>
              <button
                className="btn btn-secondary"
                onClick={() => setShowReturnConfirm(true)}
                disabled={isAdvancing || isReturning}
                aria-label={`Return application with reason: ${reason}`}
              >
                <RotateCcw size={13} aria-hidden="true" />
                Return
              </button>
            </div>
          </div>

          {/* Audit history */}
          <div>
            <div className="form-label" style={{ marginBottom: 8 }}>Recent History</div>
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
  } = useApp();

  const [filters, setFilters] = useState<Filters>({
    region: '', stage: '', route: '', overdueOnly: false,
  });
  const [selectedApp, setSelectedApp] = useState<AppRecord | null>(null);
  const [sortBy, setSortBy] = useState<'age' | 'id' | 'inst'>('age');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

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
    if (target) setSelectedApp(target);
    setPendingDrawerAppId(null);
  }, [pendingDrawerAppId, apps, setPendingDrawerAppId]);

  const handleSort = (col: 'age' | 'id' | 'inst') => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const filtered = useMemo(() => {
    let list = [...apps];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
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

  const SortIcon = ({ col }: { col: string }) => (
    <span aria-hidden="true" style={{ opacity: sortBy === col ? 1 : .3 }}>
      {sortBy === col && sortDir === 'asc' ? ' ↑' : ' ↓'}
    </span>
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Applications</h1>
        <p>Automatic routing · {apps.length} total · {filtered.length} shown</p>
      </div>

      <div className="panel">
        {/* Filters */}
        <div className="filters-bar">
          <select
            className="form-select"
            value={filters.region}
            onChange={e => setFilters(f => ({ ...f, region: e.target.value }))}
            aria-label="Filter by region"
          >
            <option value="">All regions</option>
            {['North', 'South', 'East', 'West'].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select
            className="form-select"
            value={filters.stage}
            onChange={e => setFilters(f => ({ ...f, stage: e.target.value }))}
            aria-label="Filter by stage"
          >
            <option value="">All stages</option>
            {['Scrutiny', 'EVC', 'SAC/SHC'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            className="form-select"
            value={filters.route}
            onChange={e => setFilters(f => ({ ...f, route: e.target.value }))}
            aria-label="Filter by route type"
          >
            <option value="">All routes</option>
            {['S', 'SE', 'ES', 'E', 'SES'].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: 'var(--text-2)' }}>
            <input
              type="checkbox"
              checked={filters.overdueOnly}
              onChange={e => setFilters(f => ({ ...f, overdueOnly: e.target.checked }))}
            />
            Overdue only
          </label>
          {(filters.region || filters.stage || filters.route || filters.overdueOnly) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setFilters({ region: '', stage: '', route: '', overdueOnly: false })}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
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
                      onClick={() => setSelectedApp(a)}
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
