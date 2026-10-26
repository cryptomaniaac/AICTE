import React, { useState, useMemo } from 'react';
import {
  Upload, CheckCircle, ClipboardCheck, AlertTriangle,
  Download, CheckSquare, Square, X,
  RotateCcw, Building2, Search,

} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusChip } from '../components/shared/StatusChip';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import type { UndertakingRecord } from '../types';

type StatusFilter = 'all' | 'actionable' | 'pending' | 'submitted' | 'verified';

function StatusStepper({ status }: { status: number }) {
  const steps = ['Pending', 'Submitted', 'Verified'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 7px',
            borderRadius: 6,
            background: i === status
              ? 'var(--accent)'
              : i < status ? 'var(--green-bg)' : 'var(--surface-2)',
            color: i === status
              ? 'white'
              : i < status ? 'var(--green)' : 'var(--muted)',
            border: `1px solid ${i === status
              ? 'var(--accent)'
              : i < status ? 'var(--green-border)' : 'var(--border)'}`,
          }}>
            {s}
          </span>
          {i < 2 && <span style={{ color: 'var(--muted)', fontSize: 10 }}>›</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

export function UndertakingsPage() {
  const { ul, U, handleUndertakingAction, actionLoading, searchQuery: globalSearch, showToast } = useApp();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [regionFilter, setRegionFilter] = useState<string>('All');
  const [localSearch, setLocalSearch] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Confirm dialog state for single action
  const [pendingAction, setPendingAction] = useState<{ idx: number; item: UndertakingRecord } | null>(null);

  // Batch action confirmation state
  const [batchActionType, setBatchActionType] = useState<'upload' | 'verify' | null>(null);
  const [batchProcessing, setBatchProcessing] = useState<boolean>(false);

  const activeSearch = localSearch || globalSearch;

  // Compute KPI counts across all active records
  const kpis = useMemo(() => {
    const total = ul.length;
    const atRisk = ul.filter(u => u.d <= 0 && u.s < 2).length;
    const pendingEvidence = ul.filter(u => u.s === 0).length;
    const underReview = ul.filter(u => u.s === 1).length;
    const verified = ul.filter(u => u.s >= 2).length;
    return { total, atRisk, pendingEvidence, underReview, verified };
  }, [ul]);

  // Distinct regions available
  const regions = useMemo(() => {
    const set = new Set<string>();
    ul.forEach(u => set.add(u.reg));
    return ['All', ...Array.from(set).sort()];
  }, [ul]);

  // Filtered & sorted list
  const filtered = useMemo(() => {
    return ul.filter(u => {
      // Search filter
      if (activeSearch.trim()) {
        const q = activeSearch.toLowerCase();
        const matchesQuery =
          u.inst.toLowerCase().includes(q) ||
          u.t.toLowerCase().includes(q) ||
          u.reg.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      // Region filter
      if (regionFilter !== 'All' && u.reg !== regionFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === 'actionable') return u.s < 2;
      if (statusFilter === 'pending') return u.s === 0;
      if (statusFilter === 'submitted') return u.s === 1;
      if (statusFilter === 'verified') return u.s >= 2;
      return true;
    }).sort((a, b) => a.d - b.d);
  }, [ul, activeSearch, regionFilter, statusFilter]);

  // Checkbox selection helpers
  const allFilteredSelected = filtered.length > 0 && filtered.every(u => selectedIds.has(u.id));
  const someFilteredSelected = filtered.some(u => selectedIds.has(u.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(u => u.id)));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Single action execution
  const handleAction = async () => {
    if (!pendingAction) return;
    await handleUndertakingAction(pendingAction.idx, pendingAction.item);
    setPendingAction(null);
  };

  // Batch action execution
  const executeBatchAction = async (type: 'upload' | 'verify') => {
    setBatchProcessing(true);
    const selectedList = filtered.filter(u => selectedIds.has(u.id));
    let count = 0;

    for (const item of selectedList) {
      const origIdx = U.findIndex(x => x.id === item.id);
      if (origIdx >= 0) {
        if ((type === 'upload' && item.s === 0) || (type === 'verify' && item.s < 2)) {
          await handleUndertakingAction(origIdx, item);
          count++;
        }
      }
    }

    setBatchProcessing(false);
    setBatchActionType(null);
    setSelectedIds(new Set());
    showToast('Batch Complete', `Successfully processed ${count} undertaking condition(s).`, 'success');
  };

  // Export current view as CSV
  const exportCsv = () => {
    const headers = ['ID', 'Institution', 'Condition', 'Region', 'Status Code', 'Days to Due Date'];
    const rows = filtered.map(u => [
      u.id,
      `"${u.inst.replace(/"/g, '""')}"`,
      `"${u.t.replace(/"/g, '""')}"`,
      u.reg,
      u.s >= 2 ? 'Verified' : u.s === 1 ? 'Submitted' : 'Pending',
      u.d,
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aicte_undertakings_compliance_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export Successful', `Exported ${filtered.length} undertaking records.`, 'info');
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1>Undertakings & Statutory Conditions</h1>
          <p>Time-bound institutional compliance undertakings · {kpis.pendingEvidence + kpis.underReview} pending fulfillment</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            title="Download CSV export of currently filtered undertakings"
          >
            <Download size={13} aria-hidden="true" />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: 12,
        marginBottom: 18,
      }}>
        <div
          className={`panel ${statusFilter === 'all' ? 'active-filter-panel' : ''}`}
          style={{ padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s ease' }}
          onClick={() => setStatusFilter('all')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>All Conditions</span>
            <ClipboardCheck size={15} style={{ color: 'var(--primary)' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{kpis.total}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Total compliance conditions</div>
        </div>

        <div
          className={`panel ${statusFilter === 'actionable' ? 'active-filter-panel' : ''}`}
          style={{ padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s ease' }}
          onClick={() => setStatusFilter(statusFilter === 'actionable' ? 'all' : 'actionable')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>At Risk / Overdue</span>
            <AlertTriangle size={15} style={{ color: 'var(--red)' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--red)' }}>{kpis.atRisk}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Past deadline (≤ 0d)</div>
        </div>

        <div
          className={`panel ${statusFilter === 'pending' ? 'active-filter-panel' : ''}`}
          style={{ padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s ease' }}
          onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 600 }}>Awaiting Evidence</span>
            <Upload size={15} style={{ color: 'var(--amber)' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--amber)' }}>{kpis.pendingEvidence}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Pending upload by institute</div>
        </div>

        <div
          className={`panel ${statusFilter === 'verified' ? 'active-filter-panel' : ''}`}
          style={{ padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s ease' }}
          onClick={() => setStatusFilter(statusFilter === 'verified' ? 'all' : 'verified')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>Verified & Closed</span>
            <CheckCircle size={15} style={{ color: 'var(--green)' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--green)' }}>{kpis.verified}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Officially cleared</div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="panel" style={{ padding: '12px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          {/* Status Pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>Filter:</span>
            {[
              { key: 'all' as const, label: `All (${kpis.total})` },
              { key: 'actionable' as const, label: `Actionable (${kpis.pendingEvidence + kpis.underReview})` },
              { key: 'pending' as const, label: `Awaiting Upload (${kpis.pendingEvidence})` },
              { key: 'submitted' as const, label: `Submitted (${kpis.underReview})` },
              { key: 'verified' as const, label: `Verified (${kpis.verified})` },
            ].map(f => (
              <button
                key={f.key}
                type="button"
                className={`severity-pill ${statusFilter === f.key ? 'active' : ''}`}
                onClick={() => setStatusFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Region and Search Box */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              className="filter-custom-select"
              value={regionFilter}
              onChange={e => setRegionFilter(e.target.value)}
              aria-label="Filter by region"
            >
              {regions.map(r => (
                <option key={r} value={r}>{r === 'All' ? 'All Regions' : `${r} Region`}</option>
              ))}
            </select>

            <div className="filter-search-box">
              <Search size={14} className="filter-search-icon" />
              <input
                type="text"
                placeholder="Search condition or institute…"
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

            {(regionFilter !== 'All' || statusFilter !== 'all' || localSearch) && (
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => {
                  setRegionFilter('All');
                  setStatusFilter('all');
                  setLocalSearch('');
                }}
                style={{ gap: 4 }}
              >
                <RotateCcw size={11} /> Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Batch Actions Bar (Visible when rows selected) */}
      {selectedIds.size > 0 && (
        <div style={{
          background: 'var(--accent-subtle, rgba(220, 38, 38, 0.08))',
          border: '1px solid var(--accent-border, rgba(220, 38, 38, 0.25))',
          borderRadius: 8,
          padding: '10px 16px',
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            <CheckSquare size={16} style={{ color: 'var(--accent)' }} />
            <span>{selectedIds.size} undertaking(s) selected</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setBatchActionType('upload')}
              disabled={batchProcessing}
            >
              <Upload size={12} aria-hidden="true" />
              Mark Uploaded
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setBatchActionType('verify')}
              disabled={batchProcessing}
            >
              <CheckCircle size={12} aria-hidden="true" />
              Verify All Selected
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Undertakings Table */}
      <div className="panel">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><ClipboardCheck size={40} /></div>
            <h3>No undertakings matching criteria</h3>
            <p>Try clearing filters or checking other regional parameters.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={toggleSelectAll}
                      title={allFilteredSelected ? 'Deselect all' : 'Select all'}
                      aria-label={allFilteredSelected ? 'Deselect all' : 'Select all'}
                      style={{ padding: 4 }}
                    >
                      {allFilteredSelected ? (
                        <CheckSquare size={16} style={{ color: 'var(--primary)' }} />
                      ) : someFilteredSelected ? (
                        <CheckSquare size={16} style={{ opacity: 0.5 }} />
                      ) : (
                        <Square size={16} style={{ color: 'var(--muted)' }} />
                      )}
                    </button>
                  </th>
                  <th>Institution</th>
                  <th>Compliance Condition</th>
                  <th>Region</th>
                  <th>Status Workflow</th>
                  <th>Due Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const originalIdx = U.findIndex(x => x.id === u.id);
                  const isActing = actionLoading === `un-${originalIdx}`;
                  const isUpload = u.s === 0;
                  const isSelected = selectedIds.has(u.id);

                  return (
                    <tr
                      key={u.id}
                      style={{
                        background: isSelected
                          ? 'var(--accent-subtle, rgba(220, 38, 38, 0.04))'
                          : u.d <= 0 && u.s < 2
                          ? 'var(--red-bg)'
                          : undefined,
                      }}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => toggleSelectOne(u.id)}
                          aria-label={`Select ${u.inst}`}
                          style={{ padding: 4 }}
                        >
                          {isSelected ? (
                            <CheckSquare size={15} style={{ color: 'var(--primary)' }} />
                          ) : (
                            <Square size={15} style={{ color: 'var(--muted)' }} />
                          )}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <Building2 size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                          <div style={{ fontWeight: 600, color: 'var(--text)' }}>{u.inst}</div>
                        </div>
                      </td>
                      <td style={{ maxWidth: 260 }}>
                        <span style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.4 }}>{u.t}</span>
                      </td>
                      <td>
                        <span className="chip chip-grey">{u.reg}</span>
                      </td>
                      <td>
                        <StatusStepper status={u.s} />
                      </td>
                      <td>
                        {u.s >= 2 ? (
                          <span className="chip chip-green">Closed</span>
                        ) : (
                          <StatusChip days={u.d} />
                        )}
                      </td>
                      <td>
                        {u.s < 2 ? (
                          <button
                            className={`btn btn-xs ${isUpload ? 'btn-secondary' : 'btn-primary'}`}
                            onClick={() => setPendingAction({ idx: originalIdx, item: u })}
                            disabled={isActing}
                            aria-label={isUpload ? `Upload evidence for ${u.inst}` : `Verify undertaking for ${u.inst}`}
                            style={{ gap: 4 }}
                          >
                            {isActing
                              ? 'Processing…'
                              : isUpload
                              ? <><Upload size={12} aria-hidden="true" /> Upload Evidence</>
                              : <><CheckCircle size={12} aria-hidden="true" /> Verify</>
                            }
                          </button>
                        ) : (
                          <span style={{ color: 'var(--green)', fontSize: 12, fontWeight: 600 }}>✓ Verified</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Single Action Dialog */}
      <ConfirmDialog
        isOpen={!!pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={handleAction}
        title={pendingAction?.item.s === 0 ? 'Upload Compliance Evidence' : 'Verify Undertaking Condition'}
        message={
          pendingAction && (
            <div>
              <p style={{ marginBottom: 8 }}>
                {pendingAction.item.s === 0
                  ? <>Mark statutory compliance evidence as submitted for <strong>{pendingAction.item.inst}</strong>?</>
                  : <>Verify statutory condition for <strong>{pendingAction.item.inst}</strong>: <em>"{pendingAction.item.t}"</em>? This closes the condition.</>
                }
              </p>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                Region: {pendingAction.item.reg} · Target Days: {pendingAction.item.d}d
              </div>
            </div>
          )
        }
        confirmLabel={pendingAction?.item.s === 0 ? 'Upload Evidence' : 'Verify & Close'}
      />

      {/* Batch Action Dialog */}
      <ConfirmDialog
        isOpen={!!batchActionType}
        onClose={() => setBatchActionType(null)}
        onConfirm={() => batchActionType && executeBatchAction(batchActionType)}
        title={batchActionType === 'upload' ? 'Batch Upload Evidence' : 'Batch Verify Undertakings'}
        message={
          <>
            Are you sure you want to {batchActionType === 'upload' ? 'mark evidence uploaded for' : 'verify and close'} <strong>{selectedIds.size}</strong> selected undertaking(s)?
          </>
        }
        confirmLabel={batchActionType === 'upload' ? 'Process Uploads' : 'Verify All'}
      />
    </div>
  );
}
