import { useState, useMemo } from 'react';
import {
  Bell, Play, AlertOctagon, AlertTriangle, Clock,
  Send, Building2, ExternalLink, Filter, Search,
  Download, ArrowRight, RotateCcw, X,
} from 'lucide-react';
import { useApp, alertLevel } from '../context/AppContext';
import { StatusChip } from '../components/shared/StatusChip';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import type { UrgencyItem } from '../types';

type Level = 'L3' | 'L2' | 'L1';

const LEVEL_INFO: Record<Level, { label: string; desc: string; notified: string; colorClass: string; consequence: string }> = {
  L3: {
    label: 'L3 — Critical Breach',
    desc: 'Overdue by more than 7 days past statutory SLA',
    notified: 'AICTE Member Secretary & Bureau Head notified immediately',
    consequence: 'Subject to mandatory review, Show-Cause Notice & penalty proceedings',
    colorClass: 'chip-l3',
  },
  L2: {
    label: 'L2 — Overdue Threshold',
    desc: 'Past statutory SLA deadline (1–7 days overdue)',
    notified: 'Regional Officer & Scrutiny Convener notified',
    consequence: 'Formal explanation required within 48 hours',
    colorClass: 'chip-l2',
  },
  L1: {
    label: 'L1 — Proactive Warning',
    desc: 'Approaching deadline (within next 15 days)',
    notified: 'Institution Nodal Officer reminded automatically',
    consequence: 'Automated SMS & Portal warning generated',
    colorClass: 'chip-l1',
  },
};

export function EscalationsPage() {
  const {
    urgencyItems,
    actionLoading,
    handleSweep,
    setPage,
    setSearchQuery,
    setPendingDrawerAppId,
    showToast,
  } = useApp();

  const [levelFilter, setLevelFilter] = useState<'all' | Level>('all');
  const [regionFilter, setRegionFilter] = useState<string>('All');
  const [localSearch, setLocalSearch] = useState<string>('');

  // Escalation action state
  const [selectedEscalation, setSelectedEscalation] = useState<{
    item: UrgencyItem;
    actionType: 'show-cause' | 'ro-warning' | 'reminder';
  } | null>(null);
  const [isActionExecuting, setIsActionExecuting] = useState(false);

  const isSweeping = actionLoading === 'sweep';

  // Grouped items
  const grouped: Record<Level, UrgencyItem[]> = useMemo(() => ({
    L3: urgencyItems.filter(x => alertLevel(x.d) === 'L3'),
    L2: urgencyItems.filter(x => alertLevel(x.d) === 'L2'),
    L1: urgencyItems.filter(x => alertLevel(x.d) === 'L1'),
  }), [urgencyItems]);

  const totalEscalations = urgencyItems.length;

  const counts = useMemo(() => ({
    all: totalEscalations,
    l3: grouped.L3.length,
    l2: grouped.L2.length,
    l1: grouped.L1.length,
  }), [totalEscalations, grouped]);

  // Regional breakdown
  const regionBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    urgencyItems.forEach(x => {
      counts[x.reg] = (counts[x.reg] || 0) + 1;
    });
    return counts;
  }, [urgencyItems]);

  // Distinct regions
  const regions = useMemo(() => {
    const set = new Set<string>();
    urgencyItems.forEach(x => set.add(x.reg));
    return ['All', ...Array.from(set).sort()];
  }, [urgencyItems]);

  // Filtered items based on user criteria
  const filteredItems = useMemo(() => {
    return urgencyItems.filter(x => {
      const lvl = alertLevel(x.d) as Level;
      if (levelFilter !== 'all' && lvl !== levelFilter) return false;
      if (regionFilter !== 'All' && x.reg !== regionFilter) return false;
      if (localSearch.trim()) {
        const q = localSearch.toLowerCase();
        const match = x.inst.toLowerCase().includes(q) ||
          x.kind.toLowerCase().includes(q) ||
          (x.stage && x.stage.toLowerCase().includes(q)) ||
          x.reg.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    }).sort((a, b) => a.d - b.d);
  }, [urgencyItems, levelFilter, regionFilter, localSearch]);

  // Quick navigation to Application drawer or page
  const handleNavigateApp = (item: UrgencyItem) => {
    if (item.appId) {
      setPage('ap');
      setSearchQuery(item.inst);
      setPendingDrawerAppId(item.appId);
    } else {
      setPage('ap');
      setSearchQuery(item.inst);
    }
  };

  // Execute statutory escalation action
  const handleConfirmAction = async () => {
    if (!selectedEscalation) return;
    setIsActionExecuting(true);
    await new Promise(r => setTimeout(r, 600));

    const { item, actionType } = selectedEscalation;
    if (actionType === 'show-cause') {
      showToast(
        'Show-Cause Notice Dispatched',
        `Official statutory Show-Cause Notice sent to ${item.inst} and Bureau Head. Response required in 48h.`,
        'warn'
      );
    } else if (actionType === 'ro-warning') {
      showToast(
        'RO Directive Issued',
        `Expedited resolution directive issued to ${item.reg} Regional Officer for ${item.inst}.`,
        'info'
      );
    } else {
      showToast(
        'Reminder Transmitted',
        `Automated portal reminder transmitted to Nodal Officer of ${item.inst}.`,
        'success'
      );
    }

    setIsActionExecuting(false);
    setSelectedEscalation(null);
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['Severity Level', 'Item Type', 'Stage', 'Institution', 'Region', 'Days to Deadline', 'Action Status'];
    const rows = filteredItems.map(x => [
      alertLevel(x.d),
      `"${x.kind}"`,
      `"${x.stage || 'N/A'}"`,
      `"${x.inst.replace(/"/g, '""')}"`,
      x.reg,
      x.d,
      x.d < -7 ? 'Bureau Escalation' : x.d < 0 ? 'RO Alert' : 'Reminder Sent',
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aicte_escalation_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export Generated', `Exported ${filteredItems.length} escalation items.`, 'info');
  };

  return (
    <div className="page-content">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1>Statutory Escalation Ladder</h1>
          <p>Real-time SLA tracking, multi-tier notification protocols, and bureau escalation directives</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleExportCsv}
            disabled={filteredItems.length === 0}
            title="Export escalations manifest as CSV"
          >
            <Download size={13} aria-hidden="true" />
            Export CSV
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSweep}
            disabled={isSweeping}
            aria-label="Run escalation alert sweep across all items"
          >
            <Play size={13} aria-hidden="true" />
            {isSweeping ? 'Running Sweep…' : 'Run Alert Sweep'}
          </button>
        </div>
      </div>

      {/* KPI Ladder Summary Panels */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: 12,
        marginBottom: 18,
      }}>
        {/* L3 Card */}
        <div
          className={`panel ${levelFilter === 'L3' ? 'active-filter-panel' : ''}`}
          style={{
            padding: '16px 18px',
            borderLeft: '4px solid var(--red)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onClick={() => setLevelFilter(levelFilter === 'L3' ? 'all' : 'L3')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="chip chip-l3" style={{ fontSize: 11, fontWeight: 700 }}>L3 — Critical</span>
            <AlertOctagon size={16} style={{ color: 'var(--red)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--red)' }}>{grouped.L3.length}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 2 }}>{LEVEL_INFO.L3.desc}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>📬 Bureau Head escalation</div>
        </div>

        {/* L2 Card */}
        <div
          className={`panel ${levelFilter === 'L2' ? 'active-filter-panel' : ''}`}
          style={{
            padding: '16px 18px',
            borderLeft: '4px solid var(--amber)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onClick={() => setLevelFilter(levelFilter === 'L2' ? 'all' : 'L2')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="chip chip-l2" style={{ fontSize: 11, fontWeight: 700 }}>L2 — Overdue</span>
            <AlertTriangle size={16} style={{ color: 'var(--amber)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--amber)' }}>{grouped.L2.length}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 2 }}>{LEVEL_INFO.L2.desc}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>📬 Regional Officer notice</div>
        </div>

        {/* L1 Card */}
        <div
          className={`panel ${levelFilter === 'L1' ? 'active-filter-panel' : ''}`}
          style={{
            padding: '16px 18px',
            borderLeft: '4px solid var(--blue)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onClick={() => setLevelFilter(levelFilter === 'L1' ? 'all' : 'L1')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="chip chip-l1" style={{ fontSize: 11, fontWeight: 700 }}>L1 — Due Soon</span>
            <Clock size={16} style={{ color: 'var(--blue)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--blue)' }}>{grouped.L1.length}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 2 }}>{LEVEL_INFO.L1.desc}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>📬 Automated SMS/email</div>
        </div>

        {/* Total Overview Card */}
        <div
          className={`panel ${levelFilter === 'all' ? 'active-filter-panel' : ''}`}
          style={{
            padding: '16px 18px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onClick={() => setLevelFilter('all')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>Active Alerts</span>
            <Bell size={16} style={{ color: 'var(--primary)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>{totalEscalations}</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
            {Object.entries(regionBreakdown).map(([r, c]) => `${r}: ${c}`).join(' · ') || 'No regional pendency'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--primary)', marginTop: 4, fontWeight: 500 }}>
            {levelFilter === 'all' ? 'Showing all levels' : 'Click to show all'}
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="panel" style={{ padding: '12px 18px', marginBottom: 14 }}>
        <div className="filter-toolbar">
          {/* Level Filter Pills */}
          <div className="severity-pill-group">
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginRight: 2 }}>Severity:</span>

            <button
              className={`severity-pill ${levelFilter === 'all' ? 'active' : ''}`}
              onClick={() => setLevelFilter('all')}
              title="Show all active regulatory items"
            >
              <span>All Severities</span>
              <span className="pill-count">{counts.all}</span>
            </button>

            <button
              className={`severity-pill pill-l3 ${levelFilter === 'L3' ? 'active' : ''}`}
              onClick={() => setLevelFilter('L3')}
              title="Filter by Level 3 Critical Breaches (>7 days overdue)"
            >
              <span>L3 — Critical</span>
              <span className="pill-count">{counts.l3}</span>
            </button>

            <button
              className={`severity-pill pill-l2 ${levelFilter === 'L2' ? 'active' : ''}`}
              onClick={() => setLevelFilter('L2')}
              title="Filter by Level 2 Overdue Threshold (1-7 days overdue)"
            >
              <span>L2 — Overdue</span>
              <span className="pill-count">{counts.l2}</span>
            </button>

            <button
              className={`severity-pill pill-l1 ${levelFilter === 'L1' ? 'active' : ''}`}
              onClick={() => setLevelFilter('L1')}
              title="Filter by Level 1 Approaching SLA Deadlines (within 15 days)"
            >
              <span>L1 — Due Soon</span>
              <span className="pill-count">{counts.l1}</span>
            </button>
          </div>

          {/* Region, Search, and Reset Controls */}
          <div className="filter-controls-group">
            <div className="filter-select-wrapper">
              <Filter size={13} style={{ color: 'var(--muted)' }} />
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>Region:</span>
              <select
                className="filter-custom-select"
                value={regionFilter}
                onChange={e => setRegionFilter(e.target.value)}
                aria-label="Filter by AICTE Region"
              >
                {regions.map(r => (
                  <option key={r} value={r}>{r === 'All' ? 'All Regions' : r}</option>
                ))}
              </select>
            </div>

            <div className="filter-search-box">
              <Search size={13} className="filter-search-icon" />
              <input
                type="text"
                className="filter-search-input"
                placeholder="Filter institution or item…"
                value={localSearch}
                onChange={e => setLocalSearch(e.target.value)}
                aria-label="Filter institution or item"
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

            {(levelFilter !== 'all' || regionFilter !== 'All' || localSearch) && (
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => { setLevelFilter('all'); setRegionFilter('All'); setLocalSearch(''); }}
                style={{ fontSize: 11, color: 'var(--muted)', gap: 4, height: 32 }}
                title="Reset all filters to default"
              >
                <RotateCcw size={11} /> Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Escalations List Table */}
      <div className="panel">
        {filteredItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Bell size={40} /></div>
            <h3>No escalations match current filters</h3>
            <p>All items in this view are within compliant SLA windows.</p>
            <button
              className="btn btn-sm btn-secondary"
              style={{ marginTop: 12 }}
              onClick={() => { setLevelFilter('all'); setRegionFilter('All'); setLocalSearch(''); }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 100 }}>Level</th>
                  <th>Item Description</th>
                  <th>Institution</th>
                  <th>Region</th>
                  <th>Timeline Status</th>
                  <th style={{ textAlign: 'right' }}>Direct Statutory Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((x, i) => {
                  const lvl = alertLevel(x.d) as Level;
                  const info = LEVEL_INFO[lvl] || LEVEL_INFO.L1;

                  return (
                    <tr key={i} style={{ background: lvl === 'L3' ? 'var(--red-bg)' : undefined }}>
                      <td>
                        <span className={`chip ${info.colorClass}`} style={{ fontWeight: 700 }}>
                          {lvl}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                          {x.kind}{x.stage ? ` · Stage: ${x.stage}` : ''}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          {info.consequence}
                        </div>
                      </td>
                      <td style={{ maxWidth: 240 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Building2 size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                          <button
                            className="btn-ghost"
                            onClick={() => handleNavigateApp(x)}
                            style={{
                              padding: 0,
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--primary)',
                              fontWeight: 600,
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                            title="Open related record"
                          >
                            <span className="truncate">{x.inst}</span>
                            <ExternalLink size={11} />
                          </button>
                        </div>
                        {x.appId && (
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                            Application ID: {x.appId}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="chip chip-grey">{x.reg}</span>
                      </td>
                      <td>
                        <StatusChip days={x.d} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end' }}>
                          {lvl === 'L3' && (
                            <button
                              className="btn btn-xs btn-primary"
                              onClick={() => setSelectedEscalation({ item: x, actionType: 'show-cause' })}
                              style={{ background: 'var(--red)', borderColor: 'var(--red)', gap: 4 }}
                            >
                              <Send size={11} /> Issue Show-Cause
                            </button>
                          )}
                          {lvl === 'L2' && (
                            <button
                              className="btn btn-xs btn-secondary"
                              onClick={() => setSelectedEscalation({ item: x, actionType: 'ro-warning' })}
                              style={{ gap: 4 }}
                            >
                              <AlertTriangle size={11} style={{ color: 'var(--amber)' }} /> Directive to RO
                            </button>
                          )}
                          {lvl === 'L1' && (
                            <button
                              className="btn btn-xs btn-ghost"
                              onClick={() => setSelectedEscalation({ item: x, actionType: 'reminder' })}
                              style={{ gap: 4 }}
                            >
                              <Send size={11} /> Send Reminder
                            </button>
                          )}
                          <button
                            className="btn btn-xs btn-ghost"
                            onClick={() => handleNavigateApp(x)}
                            title="Navigate to application details"
                          >
                            <ArrowRight size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Statutory Escalation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!selectedEscalation}
        onClose={() => setSelectedEscalation(null)}
        onConfirm={handleConfirmAction}
        title={
          selectedEscalation?.actionType === 'show-cause'
            ? 'Issue Statutory Show-Cause Notice'
            : selectedEscalation?.actionType === 'ro-warning'
            ? 'Issue Regional Officer Directive'
            : 'Send Institutional Reminder'
        }
        message={
          selectedEscalation && (
            <>
              {selectedEscalation.actionType === 'show-cause' && (
                <>
                  Are you sure you want to issue a formal <strong>Show-Cause Notice</strong> under AICTE Act regulations to <strong>{selectedEscalation.item.inst}</strong>? This will notify the Bureau Head, log the incident in the National Audit Trail, and mandate a 48-hour response window.
                </>
              )}
              {selectedEscalation.actionType === 'ro-warning' && (
                <>
                  Issue an expedited resolution directive to the <strong>{selectedEscalation.item.reg} Regional Officer</strong> regarding <strong>{selectedEscalation.item.inst}</strong>?
                </>
              )}
              {selectedEscalation.actionType === 'reminder' && (
                <>
                  Dispatch an automated reminder notification to <strong>{selectedEscalation.item.inst}</strong> for compliance with <em>{selectedEscalation.item.kind}</em>?
                </>
              )}
            </>
          )
        }
        confirmLabel={
          isActionExecuting
            ? 'Dispatching…'
            : selectedEscalation?.actionType === 'show-cause'
            ? 'Dispatch Show-Cause Notice'
            : selectedEscalation?.actionType === 'ro-warning'
            ? 'Issue Directive'
            : 'Send Reminder'
        }
      />
    </div>
  );
}
