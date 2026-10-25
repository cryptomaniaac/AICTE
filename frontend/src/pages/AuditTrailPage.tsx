import { useState, useMemo } from 'react';
import { Search, Download, ScrollText } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function AuditTrailPage() {
  const { LOG, handleExportCsv, actionLoading } = useApp();
  const [search, setSearch] = useState('');
  const [actorFilter, setActorFilter] = useState('');

  const actors = useMemo(() => {
    return Array.from(new Set(LOG.map(l => l.who))).sort();
  }, [LOG]);

  const filtered = useMemo(() => {
    let list = [...LOG];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l =>
        l.x.toLowerCase().includes(q) ||
        l.who.toLowerCase().includes(q) ||
        l.t.toLowerCase().includes(q)
      );
    }
    if (actorFilter) {
      list = list.filter(l => l.who === actorFilter);
    }
    return list;
  }, [LOG, search, actorFilter]);

  const isExporting = actionLoading === 'export-csv';

  return (
    <div className="page-content">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1>Audit Trail</h1>
          <p>{LOG.length} total entries · newest first</p>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleExportCsv}
          disabled={isExporting}
          aria-label="Export audit trail as CSV"
        >
          <Download size={13} aria-hidden="true" />
          {isExporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      <div className="panel">
        {/* Filters */}
        <div className="filters-bar">
          <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
            <Search
              size={13}
              style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-2)', pointerEvents: 'none' }}
              aria-hidden="true"
            />
            <input
              type="search"
              className="form-input"
              style={{ paddingLeft: 28 }}
              placeholder="Search events…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search audit log events"
            />
          </div>
          <select
            className="form-select"
            value={actorFilter}
            onChange={e => setActorFilter(e.target.value)}
            aria-label="Filter by actor"
          >
            <option value="">All actors</option>
            {actors.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          {(search || actorFilter) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setActorFilter(''); }}>
              Clear
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>
            {filtered.length} / {LOG.length} entries
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><ScrollText size={40} /></div>
            <h3>No log entries match your search</h3>
            <p>Try a different search term or clear the filters.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 170 }}>When</th>
                  <th style={{ minWidth: 120 }}>Actor</th>
                  <th>Event</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l, idx) => (
                  <tr key={idx}>
                    <td className="audit-ts">{l.t}</td>
                    <td>
                      <span className="chip chip-grey" style={{ fontSize: 11 }}>{l.who}</span>
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{l.x}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
