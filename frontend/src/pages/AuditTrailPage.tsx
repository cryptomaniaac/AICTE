import { useState, useMemo } from 'react';
import {
  Search, Download, ScrollText, CheckCircle, RotateCcw,
  FileSignature, Zap, Activity, Clock,
  Table, List, User,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

type EventCategory = 'all' | 'advance' | 'revert' | 'document' | 'sweep' | 'system';

interface LogItem {
  t: string;
  who: string;
  x: string;
}

function getEventCategory(text: string): EventCategory {
  const t = text.toLowerCase();
  if (t.includes('advance') || t.includes('cleared') || t.includes('approved') || t.includes('stage')) return 'advance';
  if (t.includes('revert') || t.includes('return') || t.includes('deficiency') || t.includes('reject')) return 'revert';
  if (t.includes('document') || t.includes('lease') || t.includes('undertaking') || t.includes('renew')) return 'document';
  if (t.includes('sweep') || t.includes('scan') || t.includes('alert') || t.includes('sla')) return 'sweep';
  return 'system';
}

function getCategoryMeta(cat: EventCategory) {
  switch (cat) {
    case 'advance':
      return { label: 'Stage Advance', color: 'var(--green)', bg: 'var(--green-bg)', border: 'var(--green-border)', icon: CheckCircle };
    case 'revert':
      return { label: 'Deficiency / Revert', color: 'var(--red)', bg: 'var(--red-bg)', border: 'var(--red-border)', icon: RotateCcw };
    case 'document':
      return { label: 'Compliance Doc', color: 'var(--blue)', bg: 'var(--blue-bg)', border: 'var(--blue-border)', icon: FileSignature };
    case 'sweep':
      return { label: 'SLA Sweep', color: 'var(--purple, #8b5cf6)', bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.25)', icon: Zap };
    default:
      return { label: 'System Action', color: 'var(--muted)', bg: 'var(--surface-2)', border: 'var(--border)', icon: Activity };
  }
}

function getActorBadge(who: string) {
  const w = who.toLowerCase();
  if (w.includes('system') || w.includes('bot')) {
    return { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: 'rgba(139, 92, 246, 0.25)' };
  }
  if (w.includes('regional') || w.includes('ro')) {
    return { bg: 'var(--blue-bg)', color: 'var(--blue)', border: 'var(--blue-border)' };
  }
  if (w.includes('scrutiny') || w.includes('officer')) {
    return { bg: 'var(--green-bg)', color: 'var(--green)', border: 'var(--green-border)' };
  }
  return { bg: 'var(--surface-2)', color: 'var(--text-2)', border: 'var(--border)' };
}

export function AuditTrailPage() {
  const { LOG, showToast } = useApp();
  const [search, setSearch] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<EventCategory>('all');
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');
  const [isExporting, setIsExporting] = useState(false);

  // Distinct actors
  const actors = useMemo(() => {
    return Array.from(new Set(LOG.map(l => l.who))).sort();
  }, [LOG]);

  // Aggregate stats
  const stats = useMemo(() => {
    let advances = 0;
    let reverts = 0;
    let docs = 0;
    let sweeps = 0;

    LOG.forEach(l => {
      const cat = getEventCategory(l.x);
      if (cat === 'advance') advances++;
      else if (cat === 'revert') reverts++;
      else if (cat === 'document') docs++;
      else if (cat === 'sweep') sweeps++;
    });

    return { total: LOG.length, advances, reverts, docs, sweeps };
  }, [LOG]);

  // Filtered log
  const filtered = useMemo(() => {
    let list = [...LOG];

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l =>
        l.x.toLowerCase().includes(q) ||
        l.who.toLowerCase().includes(q) ||
        l.t.toLowerCase().includes(q)
      );
    }

    // Actor filter
    if (actorFilter) {
      list = list.filter(l => l.who === actorFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      list = list.filter(l => getEventCategory(l.x) === categoryFilter);
    }

    return list;
  }, [LOG, search, actorFilter, categoryFilter]);

  const handleExportAuditLogs = () => {
    setIsExporting(true);
    try {
      const headers = ['Timestamp', 'Actor', 'Event Description', 'Category'];
      const rows = filtered.map(l => [
        `"${l.t}"`,
        `"${l.who}"`,
        `"${l.x.replace(/"/g, '""')}"`,
        `"${getEventCategory(l.x)}"`,
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aicte_audit_trail_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Audit Trail Exported', `${filtered.length} log events downloaded as CSV`, 'success');
    } catch (err: any) {
      showToast('Export Failed', err?.message || 'Could not export audit log', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1>Immutable Audit Trail</h1>
          <p>Complete historical registry of statutory approvals, procedural reverts, and system SLA sweeps</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* View Mode Toggle */}
          <div style={{ display: 'inline-flex', background: 'var(--surface-2)', padding: 3, borderRadius: 8, border: '1px solid var(--border)' }}>
            <button
              className={`btn btn-xs ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('table')}
              style={{ borderRadius: 6, gap: 5 }}
              aria-pressed={viewMode === 'table'}
            >
              <Table size={13} /> Tabular Log
            </button>
            <button
              className={`btn btn-xs ${viewMode === 'timeline' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('timeline')}
              style={{ borderRadius: 6, gap: 5 }}
              aria-pressed={viewMode === 'timeline'}
            >
              <List size={13} /> Visual Timeline
            </button>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={handleExportAuditLogs}
            disabled={isExporting || filtered.length === 0}
            aria-label="Export audit trail as CSV"
          >
            <Download size={13} aria-hidden="true" />
            {isExporting ? 'Exporting…' : 'Export Full CSV'}
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
        marginBottom: 18,
      }}>
        <div
          className={`panel ${categoryFilter === 'all' ? 'active-filter-panel' : ''}`}
          style={{ padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s ease' }}
          onClick={() => setCategoryFilter('all')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>All Events</span>
            <ScrollText size={15} style={{ color: 'var(--primary)' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{stats.total}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Complete action history</div>
        </div>

        <div
          className={`panel ${categoryFilter === 'advance' ? 'active-filter-panel' : ''}`}
          style={{ padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s ease' }}
          onClick={() => setCategoryFilter(categoryFilter === 'advance' ? 'all' : 'advance')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>Stage Advances</span>
            <CheckCircle size={15} style={{ color: 'var(--green)' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--green)' }}>{stats.advances}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Approvals granted</div>
        </div>

        <div
          className={`panel ${categoryFilter === 'revert' ? 'active-filter-panel' : ''}`}
          style={{ padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s ease' }}
          onClick={() => setCategoryFilter(categoryFilter === 'revert' ? 'all' : 'revert')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>Deficiencies & Returns</span>
            <RotateCcw size={15} style={{ color: 'var(--red)' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--red)' }}>{stats.reverts}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Sent back for correction</div>
        </div>

        <div
          className={`panel ${categoryFilter === 'document' ? 'active-filter-panel' : ''}`}
          style={{ padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s ease' }}
          onClick={() => setCategoryFilter(categoryFilter === 'document' ? 'all' : 'document')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600 }}>Document Compliance</span>
            <FileSignature size={15} style={{ color: 'var(--blue)' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)' }}>{stats.docs}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Leases & undertakings</div>
        </div>

        <div
          className={`panel ${categoryFilter === 'sweep' ? 'active-filter-panel' : ''}`}
          style={{ padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s ease' }}
          onClick={() => setCategoryFilter(categoryFilter === 'sweep' ? 'all' : 'sweep')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: '#8b5cf6', fontWeight: 600 }}>Automated Sweeps</span>
            <Zap size={15} style={{ color: '#8b5cf6' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#8b5cf6' }}>{stats.sweeps}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Scheduled SLA monitors</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="panel" style={{ padding: '14px 18px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          {/* Category Chips */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>Category:</span>
            {[
              { key: 'all' as const, label: 'All' },
              { key: 'advance' as const, label: 'Advances' },
              { key: 'revert' as const, label: 'Deficiencies' },
              { key: 'document' as const, label: 'Compliance Docs' },
              { key: 'sweep' as const, label: 'SLA Sweeps' },
            ].map(cat => (
              <button
                key={cat.key}
                className={`btn btn-xs ${categoryFilter === cat.key ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setCategoryFilter(cat.key)}
                style={{ borderRadius: 6, fontWeight: categoryFilter === cat.key ? 600 : 500 }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Actor Select & Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <User size={13} style={{ color: 'var(--muted)' }} />
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Actor:</span>
              <select
                className="filter-custom-select"
                value={actorFilter}
                onChange={e => setActorFilter(e.target.value)}
                aria-label="Filter by actor"
              >
                <option value="">All Actors</option>
                {actors.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div className="filter-search-box">
              <Search size={13} className="filter-search-icon" />
              <input
                type="text"
                className="filter-search-input"
                placeholder="Search audit trail…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                aria-label="Search audit trail"
              />
            </div>

            {(search || actorFilter || categoryFilter !== 'all') && (
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => { setSearch(''); setActorFilter(''); setCategoryFilter('all'); }}
                style={{ color: 'var(--muted)' }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area: Table View or Timeline View */}
      {filtered.length === 0 ? (
        <div className="panel">
          <div className="empty-state">
            <div className="empty-state-icon"><ScrollText size={40} /></div>
            <h3>No log entries match your search</h3>
            <p>Try clearing your search query or adjusting the actor and category filters.</p>
            <button
              className="btn btn-sm btn-secondary"
              style={{ marginTop: 12 }}
              onClick={() => { setSearch(''); setActorFilter(''); setCategoryFilter('all'); }}
            >
              Reset Filters
            </button>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        <div className="panel">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 160 }}>Timestamp</th>
                  <th style={{ minWidth: 140 }}>Actor</th>
                  <th style={{ minWidth: 150 }}>Action Type</th>
                  <th>Event Description</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l: LogItem, idx: number) => {
                  const cat = getEventCategory(l.x);
                  const meta = getCategoryMeta(cat);
                  const Icon = meta.icon;
                  const actorStyle = getActorBadge(l.who);

                  return (
                    <tr key={idx}>
                      <td className="audit-ts" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={12} style={{ color: 'var(--muted)' }} />
                        {l.t}
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: actorStyle.bg,
                            color: actorStyle.color,
                            border: `1px solid ${actorStyle.border}`,
                            display: 'inline-block',
                          }}
                        >
                          {l.who}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: meta.bg,
                            color: meta.color,
                            border: `1px solid ${meta.border}`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Icon size={11} />
                          {meta.label}
                        </span>
                      </td>
                      <td style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 500 }}>
                        {l.x}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Visual Vertical Timeline */
        <div className="panel" style={{ padding: '24px 28px' }}>
          <div style={{ position: 'relative', paddingLeft: 24, borderLeft: '2px solid var(--border)' }}>
            {filtered.map((l: LogItem, idx: number) => {
              const cat = getEventCategory(l.x);
              const meta = getCategoryMeta(cat);
              const Icon = meta.icon;
              const actorStyle = getActorBadge(l.who);

              return (
                <div key={idx} style={{ position: 'relative', marginBottom: 24 }}>
                  {/* Timeline bullet icon */}
                  <div style={{
                    position: 'absolute',
                    left: -33,
                    top: 2,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: meta.bg,
                    border: `2px solid ${meta.color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Icon size={10} style={{ color: meta.color }} />
                  </div>

                  {/* Timeline Event Content */}
                  <div style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '12px 16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: meta.bg,
                            color: meta.color,
                            border: `1px solid ${meta.border}`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Icon size={11} /> {meta.label}
                        </span>

                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '2px 7px',
                            borderRadius: 6,
                            background: actorStyle.bg,
                            color: actorStyle.color,
                            border: `1px solid ${actorStyle.border}`,
                          }}
                        >
                          {l.who}
                        </span>
                      </div>

                      <span style={{ fontSize: 11.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} /> {l.t}
                      </span>
                    </div>

                    <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, lineHeight: 1.5 }}>
                      {l.x}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
