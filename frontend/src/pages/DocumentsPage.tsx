import React, { useState, useMemo } from 'react';
import {
  Upload, CheckCircle, FileSignature, AlertTriangle,
  Download, CheckSquare, Square, X, Calendar,
  ShieldCheck, ArrowUpDown, Building2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusChip } from '../components/shared/StatusChip';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import type { DocumentRecord } from '../types';

type StatusFilter = 'all' | 'actionable' | 'pending' | 'submitted' | 'expired' | 'renewed';

function StatusStepper({ status, isExpired }: { status: number; isExpired: boolean }) {
  const steps = ['Pending', 'Submitted', 'Renewed'];
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
              ? (isExpired && i === 0 ? 'var(--red-bg)' : 'var(--accent)')
              : i < status ? 'var(--green-bg)' : 'var(--surface-2)',
            color: i === status
              ? (isExpired && i === 0 ? 'var(--red)' : 'white')
              : i < status ? 'var(--green)' : 'var(--muted)',
            border: `1px solid ${i === status
              ? (isExpired && i === 0 ? 'var(--red-border)' : 'var(--accent)')
              : i < status ? 'var(--green-border)' : 'var(--border)'}`,
          }}>
            {i === 0 && isExpired ? 'Expired' : s}
          </span>
          {i < 2 && <span style={{ color: 'var(--muted)', fontSize: 10 }}>›</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

export function DocumentsPage() {
  const { dl, D, handleDocumentAction, actionLoading, searchQuery, setSearchQuery, showToast } = useApp();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [regionFilter, setRegionFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<'days' | 'inst' | 'status'>('days');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Confirm dialog state for single action
  const [pendingAction, setPendingAction] = useState<{ idx: number; item: DocumentRecord } | null>(null);

  // Batch action confirmation state
  const [batchActionType, setBatchActionType] = useState<'upload' | 'renew' | null>(null);
  const [batchProcessing, setBatchProcessing] = useState<boolean>(false);

  // Compute KPI counts across all active records
  const kpis = useMemo(() => {
    const total = dl.length;
    const expired = dl.filter(d => d.d < 0 && d.s < 2).length;
    const dueSoon = dl.filter(d => d.d >= 0 && d.d <= 30 && d.s < 2).length;
    const awaitingUpload = dl.filter(d => d.s === 0).length;
    const underReview = dl.filter(d => d.s === 1).length;
    const renewed = dl.filter(d => d.s >= 2).length;
    return { total, expired, dueSoon, awaitingUpload, underReview, renewed };
  }, [dl]);

  // Distinct regions available
  const regions = useMemo(() => {
    const set = new Set<string>();
    dl.forEach(d => set.add(d.reg));
    return ['All', ...Array.from(set).sort()];
  }, [dl]);

  // Filtered & sorted document list
  const filtered = useMemo(() => {
    let result = dl.filter(d => {
      // Global/local search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery = d.inst.toLowerCase().includes(q) ||
          d.t.toLowerCase().includes(q) ||
          d.reg.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      // Region filter
      if (regionFilter !== 'All' && d.reg !== regionFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === 'actionable') return d.s < 2;
      if (statusFilter === 'pending') return d.s === 0;
      if (statusFilter === 'submitted') return d.s === 1;
      if (statusFilter === 'expired') return d.d < 0 && d.s < 2;
      if (statusFilter === 'renewed') return d.s >= 2;

      return true;
    });

    result.sort((a, b) => {
      let diff = 0;
      if (sortField === 'days') diff = a.d - b.d;
      else if (sortField === 'inst') diff = a.inst.localeCompare(b.inst);
      else if (sortField === 'status') diff = a.s - b.s;
      return sortAsc ? diff : -diff;
    });

    return result;
  }, [dl, searchQuery, regionFilter, statusFilter, sortField, sortAsc]);

  // Single Action Execution
  const handleAction = async () => {
    if (!pendingAction) return;
    await handleDocumentAction(pendingAction.idx, pendingAction.item);
    setPendingAction(null);
  };

  // Toggle selection for batching
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(d => d.id)));
    }
  };

  // Batch action execution
  const executeBatch = async (type: 'upload' | 'renew') => {
    const selectedDocs = dl.filter(d => selectedIds.has(d.id));
    if (selectedDocs.length === 0) return;

    setBatchProcessing(true);
    let count = 0;
    for (const doc of selectedDocs) {
      const origIdx = D.indexOf(doc);
      if (origIdx >= 0) {
        if ((type === 'upload' && doc.s === 0) || (type === 'renew' && doc.s < 2)) {
          await handleDocumentAction(origIdx, doc);
          count++;
        }
      }
    }
    setBatchProcessing(false);
    setBatchActionType(null);
    setSelectedIds(new Set());
    showToast('Batch Complete', `Successfully processed ${count} document(s).`, 'success');
  };

  // Export current view as CSV
  const exportCsv = () => {
    const headers = ['ID', 'Institution', 'Document Title', 'Region', 'Status Code', 'Days to Expiry'];
    const rows = filtered.map(d => [
      d.id,
      `"${d.inst.replace(/"/g, '""')}"`,
      `"${d.t.replace(/"/g, '""')}"`,
      d.reg,
      d.s >= 2 ? 'Renewed' : d.s === 1 ? 'Submitted' : 'Pending',
      d.d,
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aicte_lease_documents_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export Successful', `Exported ${filtered.length} document records.`, 'info');
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1>Lease & Compliance Documents</h1>
          <p>Statutory deeds, building safety approvals, and institutional lease agreements · {kpis.awaitingUpload + kpis.underReview} pending review</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            title="Download CSV export of currently filtered documents"
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
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>All Tracked</span>
            <FileSignature size={15} style={{ color: 'var(--primary)' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{kpis.total}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Total repository records</div>
        </div>

        <div
          className={`panel ${statusFilter === 'expired' ? 'active-filter-panel' : ''}`}
          style={{ padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s ease' }}
          onClick={() => setStatusFilter(statusFilter === 'expired' ? 'all' : 'expired')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>Expired Leases</span>
            <AlertTriangle size={15} style={{ color: 'var(--red)' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--red)' }}>{kpis.expired}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Requires urgent renewal</div>
        </div>

        <div
          className={`panel ${statusFilter === 'pending' ? 'active-filter-panel' : ''}`}
          style={{ padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s ease' }}
          onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 600 }}>Awaiting Upload</span>
            <Upload size={15} style={{ color: 'var(--amber)' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--amber)' }}>{kpis.awaitingUpload}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Pending submission</div>
        </div>

        <div
          className={`panel ${statusFilter === 'submitted' ? 'active-filter-panel' : ''}`}
          style={{ padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s ease' }}
          onClick={() => setStatusFilter(statusFilter === 'submitted' ? 'all' : 'submitted')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>Under Review</span>
            <CheckCircle size={15} style={{ color: 'var(--primary)' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)' }}>{kpis.underReview}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Ready for RO verification</div>
        </div>

        <div
          className={`panel ${statusFilter === 'renewed' ? 'active-filter-panel' : ''}`}
          style={{ padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s ease' }}
          onClick={() => setStatusFilter(statusFilter === 'renewed' ? 'all' : 'renewed')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>Renewed (+365d)</span>
            <ShieldCheck size={15} style={{ color: 'var(--green)' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--green)' }}>{kpis.renewed}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Legally certified active</div>
        </div>
      </div>

      {/* Filter Tabs & Toolbar */}
      <div className="panel" style={{ padding: '14px 18px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { key: 'all' as const, label: 'All' },
              { key: 'actionable' as const, label: 'Pending Action' },
              { key: 'expired' as const, label: 'Expired' },
              { key: 'pending' as const, label: 'Needs Upload' },
              { key: 'submitted' as const, label: 'Under Review' },
              { key: 'renewed' as const, label: 'Renewed' },
            ].map(tab => (
              <button
                key={tab.key}
                className={`btn btn-xs ${statusFilter === tab.key ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setStatusFilter(tab.key)}
                style={{ borderRadius: 6, fontWeight: statusFilter === tab.key ? 600 : 500 }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Region and Sorting Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>Region:</span>
              <select
                className="filter-custom-select"
                value={regionFilter}
                onChange={e => setRegionFilter(e.target.value)}
                aria-label="Filter documents by region"
              >
                {regions.map(r => (
                  <option key={r} value={r}>{r === 'All' ? 'All Regions' : r}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Sort:</span>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => {
                  if (sortField === 'days') setSortAsc(!sortAsc);
                  else { setSortField('days'); setSortAsc(true); }
                }}
                title="Sort by Expiry timeline"
                style={{ gap: 4 }}
              >
                <ArrowUpDown size={12} />
                Timeline {sortField === 'days' ? (sortAsc ? '↑' : '↓') : ''}
              </button>
            </div>

            {searchQuery && (
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => setSearchQuery('')}
                style={{ color: 'var(--muted)' }}
              >
                <X size={12} /> Clear search
              </button>
            )}
          </div>
        </div>

        {/* Batch action banner if items selected */}
        {selectedIds.size > 0 && (
          <div style={{
            marginTop: 12,
            padding: '8px 14px',
            background: 'var(--primary-50)',
            border: '1px solid var(--primary-border)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--primary)' }}>
              <strong>{selectedIds.size}</strong> document(s) selected
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-xs btn-primary"
                onClick={() => setBatchActionType('renew')}
                disabled={batchProcessing}
              >
                <CheckCircle size={12} /> Batch Verify & Renew (+365d)
              </button>
              <button
                className="btn btn-xs btn-secondary"
                onClick={() => setBatchActionType('upload')}
                disabled={batchProcessing}
              >
                <Upload size={12} /> Batch Mark Uploaded
              </button>
              <button
                className="btn btn-xs btn-ghost"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Table Panel */}
      <div className="panel">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><FileSignature size={40} /></div>
            <h3>No documents match current filters</h3>
            <p>Try resetting the status filter or clearing your search query.</p>
            <button
              className="btn btn-sm btn-secondary"
              style={{ marginTop: 12 }}
              onClick={() => { setStatusFilter('all'); setRegionFilter('All'); setSearchQuery(''); }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>
                    <button
                      className="btn-ghost"
                      onClick={toggleSelectAll}
                      style={{ padding: 4, cursor: 'pointer', background: 'transparent', border: 'none' }}
                      aria-label="Select all documents"
                    >
                      {selectedIds.size === filtered.length && filtered.length > 0
                        ? <CheckSquare size={15} style={{ color: 'var(--primary)' }} />
                        : <Square size={15} style={{ color: 'var(--muted)' }} />}
                    </button>
                  </th>
                  <th>Institution</th>
                  <th>Document Title & Type</th>
                  <th>Region</th>
                  <th>Workflow Status</th>
                  <th>Expiry Timeline</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => {
                  const originalIdx = D.indexOf(d);
                  const isActing = actionLoading === `dc-${originalIdx}`;
                  const isUpload = d.s === 0;
                  const isExpired = d.d < 0 && d.s < 2;
                  const isSelected = selectedIds.has(d.id);

                  return (
                    <tr
                      key={d.id}
                      style={{
                        background: isSelected
                          ? 'var(--primary-50)'
                          : isExpired
                          ? 'var(--red-bg)'
                          : undefined,
                      }}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn-ghost"
                          onClick={() => toggleSelect(d.id)}
                          style={{ padding: 4, cursor: 'pointer', background: 'transparent', border: 'none' }}
                          aria-label={`Select document for ${d.inst}`}
                        >
                          {isSelected
                            ? <CheckSquare size={15} style={{ color: 'var(--primary)' }} />
                            : <Square size={15} style={{ color: 'var(--muted)' }} />}
                        </button>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Building2 size={13} style={{ color: 'var(--muted)' }} />
                          {d.inst}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Ref DOC-{d.id}</div>
                      </td>
                      <td style={{ maxWidth: 280 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>{d.t}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <Calendar size={11} /> 12-Month Statutory Lifecycle
                        </div>
                      </td>
                      <td>
                        <span className="chip chip-grey">{d.reg}</span>
                      </td>
                      <td>
                        <StatusStepper status={d.s} isExpired={isExpired} />
                      </td>
                      <td>
                        {d.s >= 2
                          ? <span className="chip chip-green">Renewed (+365d)</span>
                          : <StatusChip days={d.d} />
                        }
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {d.s < 2 ? (
                          <button
                            className={`btn btn-sm ${isUpload ? 'btn-secondary' : 'btn-primary'}`}
                            onClick={() => setPendingAction({ idx: originalIdx, item: d })}
                            disabled={isActing}
                            aria-label={isUpload ? `Upload document for ${d.inst}` : `Verify and renew document for ${d.inst}`}
                          >
                            {isActing
                              ? 'Processing…'
                              : isUpload
                              ? <><Upload size={12} aria-hidden="true" /> Upload</>
                              : <><CheckCircle size={12} aria-hidden="true" /> Verify & Renew</>
                            }
                          </button>
                        ) : (
                          <span style={{ color: 'var(--green)', fontSize: 12, fontWeight: 600 }}>
                            ✓ Active Verified
                          </span>
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

      {/* Single Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={handleAction}
        title={pendingAction?.item.s === 0 ? 'Upload Document Proof' : 'Verify & Renew Document'}
        message={
          pendingAction && (
            <>
              {pendingAction.item.s === 0
                ? <>Confirm upload of proof for <strong>{pendingAction.item.inst}</strong>: <em>"{pendingAction.item.t}"</em>? This will progress status to <strong>Under Review</strong>.</>
                : <>Verify compliance and renew <strong>{pendingAction.item.t}</strong> for <strong>{pendingAction.item.inst}</strong>? This will validate statutory requirements and add <strong>+365 days</strong> of validity.</>
              }
            </>
          )
        }
        confirmLabel={pendingAction?.item.s === 0 ? 'Upload' : 'Verify & Renew (+365d)'}
      />

      {/* Batch Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!batchActionType}
        onClose={() => setBatchActionType(null)}
        onConfirm={() => batchActionType && executeBatch(batchActionType)}
        title={batchActionType === 'upload' ? 'Batch Upload Documents' : 'Batch Verify & Renew Documents'}
        message={
          <>
            Are you sure you want to {batchActionType === 'upload' ? 'mark as uploaded' : 'verify and renew (+365 days)'} for all <strong>{selectedIds.size}</strong> selected document(s)?
          </>
        }
        confirmLabel={batchActionType === 'upload' ? 'Upload All Selected' : 'Renew All Selected (+365d)'}
      />
    </div>
  );
}
