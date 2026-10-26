import { useState, useMemo } from 'react';
import { Calendar, Table, Clock, Search, X, RotateCcw } from 'lucide-react';


import { useApp } from '../context/AppContext';
import { StatusChip, LevelChip } from '../components/shared/StatusChip';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import type { AppRecord } from '../types';

export function EVCQueuePage() {
  const { evcs, searchQuery: globalSearch, handleRescheduleEVC, showToast } = useApp();
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [localSearch, setLocalSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'overdue' | 'dueSoon' | 'scheduled'>('all');

  // Drag and drop state
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | 'overdue' | null>(null);

  // Quick Reschedule Dialog State
  const [rescheduleTarget, setRescheduleTarget] = useState<AppRecord | null>(null);
  const [selectedTargetDays, setSelectedTargetDays] = useState<number>(7);
  const [customDays, setCustomDays] = useState<string>('');
  const [isCustomDays, setIsCustomDays] = useState<boolean>(false);

  const activeSearch = localSearch || globalSearch;

  const sorted = useMemo(() => {
    return [...evcs]
      .filter(a => {
        if (activeSearch.trim()) {
          const q = activeSearch.toLowerCase();
          const matches = a.inst.toLowerCase().includes(q) || a.id.toLowerCase().includes(q);
          if (!matches) return false;
        }
        if (regionFilter !== 'All' && a.reg !== regionFilter) return false;
        if (statusFilter === 'overdue' && a.evc >= 0) return false;
        if (statusFilter === 'dueSoon' && (a.evc < 0 || a.evc > 15)) return false;
        if (statusFilter === 'scheduled' && a.evc <= 15) return false;
        return true;
      })
      .sort((a, b) => a.evc - b.evc);
  }, [evcs, activeSearch, regionFilter, statusFilter]);

  const overdue = useMemo(() => evcs.filter(a => a.evc < 0), [evcs]);
  const dueSoon = useMemo(() => evcs.filter(a => a.evc >= 0 && a.evc <= 15), [evcs]);
  const scheduled = useMemo(() => evcs.filter(a => a.evc > 15), [evcs]);

  const handleDropOnDay = (targetDay: number | 'overdue') => {
    if (!draggedAppId) return;
    if (targetDay === 'overdue' || targetDay < 0) {
      showToast('Cannot Reschedule to Past', 'Inspections can only be rescheduled to today or a future date.', 'warn');
      setDraggedAppId(null);
      setDragOverDay(null);
      return;
    }
    handleRescheduleEVC(draggedAppId, targetDay);
    setDraggedAppId(null);
    setDragOverDay(null);
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleTarget) return;
    const finalDays = isCustomDays ? parseInt(customDays, 10) : selectedTargetDays;
    if (isNaN(finalDays) || finalDays < 0) {
      showToast('Invalid Days', 'Please select or enter a valid number of days (>= 0).', 'warn');
      return;
    }
    await handleRescheduleEVC(rescheduleTarget.id, finalDays);
    setRescheduleTarget(null);
    setIsCustomDays(false);
    setCustomDays('');
  };

  // Calendar days array: overdue + 0 to 14 days ahead
  const calendarDays = [
    { key: 'overdue' as const, label: 'Overdue', dayOffset: -1 },
    ...Array.from({ length: 15 }, (_, i) => ({
      key: i,
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `+${i}d`,
      dayOffset: i,
    })),
  ];

  return (
    <div className="page-content">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>EVC Inspection Queue</h1>
          <p>Expert Visit Committee schedules · {evcs.length} total inspections pending</p>
        </div>

        {/* View Mode Toggle */}
        <div style={{ display: 'inline-flex', background: 'var(--surface-2)', padding: 3, borderRadius: 8, border: '1px solid var(--border)' }}>
          <button
            className={`btn btn-xs ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('table')}
            style={{ borderRadius: 6, gap: 5 }}
            aria-pressed={viewMode === 'table'}
          >
            <Table size={13} /> Table View
          </button>
          <button
            className={`btn btn-xs ${viewMode === 'calendar' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('calendar')}
            style={{ borderRadius: 6, gap: 5 }}
            aria-pressed={viewMode === 'calendar'}
          >
            <Calendar size={13} /> Calendar Schedule
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 18 }}>
        <div
          className={`panel ${statusFilter === 'all' ? 'active-filter-panel' : ''}`}
          style={{ padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s ease' }}
          onClick={() => setStatusFilter('all')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>All Visits</span>
            <Calendar size={15} style={{ color: 'var(--primary)' }} />
          </div>
          <div className="tabnum" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)' }}>{evcs.length}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Total pending reviews</div>
        </div>

        <div
          className={`panel ${statusFilter === 'overdue' ? 'active-filter-panel' : ''}`}
          style={{ padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s ease' }}
          onClick={() => setStatusFilter(statusFilter === 'overdue' ? 'all' : 'overdue')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Overdue Visits</span>
            <Clock size={15} style={{ color: 'var(--red)' }} />
          </div>
          <div className="tabnum" style={{ fontSize: 26, fontWeight: 700, color: overdue.length > 0 ? 'var(--red)' : 'var(--text)' }}>{overdue.length}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Requires priority rescheduling</div>
        </div>

        <div
          className={`panel ${statusFilter === 'dueSoon' ? 'active-filter-panel' : ''}`}
          style={{ padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s ease' }}
          onClick={() => setStatusFilter(statusFilter === 'dueSoon' ? 'all' : 'dueSoon')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Due within 15d</span>
            <Clock size={15} style={{ color: 'var(--amber)' }} />
          </div>
          <div className="tabnum" style={{ fontSize: 26, fontWeight: 700, color: dueSoon.length > 0 ? 'var(--amber)' : 'var(--text)' }}>{dueSoon.length}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Upcoming committee inspections</div>
        </div>

        <div
          className={`panel ${statusFilter === 'scheduled' ? 'active-filter-panel' : ''}`}
          style={{ padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s ease' }}
          onClick={() => setStatusFilter(statusFilter === 'scheduled' ? 'all' : 'scheduled')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Scheduled (&gt;15d)</span>
            <Calendar size={15} style={{ color: 'var(--text-2)' }} />
          </div>
          <div className="tabnum" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)' }}>{scheduled.length}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>On track for inspection</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="panel" style={{ padding: '12px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>Region:</span>
            <select
              className="filter-custom-select"
              value={regionFilter}
              onChange={e => setRegionFilter(e.target.value)}
              aria-label="Filter by region"
            >
              <option value="All">All Regions</option>
              <option value="North">North</option>
              <option value="South">South</option>
              <option value="East">East</option>
              <option value="West">West</option>
            </select>

            {(regionFilter !== 'All' || statusFilter !== 'all' || localSearch) && (
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => {
                  setRegionFilter('All');
                  setStatusFilter('all');
                  setLocalSearch('');
                }}
                style={{ gap: 4 }}
              >
                <RotateCcw size={11} /> Reset filters
              </button>
            )}
          </div>

          <div className="filter-search-box" style={{ width: 240 }}>
            <Search size={14} className="filter-search-icon" />
            <input
              type="text"
              placeholder="Search EVC by ID or institute…"
              className="filter-search-input"
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
            />
            {localSearch && (
              <button
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
        {sorted.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Calendar size={40} /></div>
            <h3>No EVC inspections matching criteria</h3>
            <p>Try resetting filters or adjusting search keywords.</p>
          </div>
        ) : viewMode === 'calendar' ? (
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                Drag an inspection card to any day slot to reschedule
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                Past dates rejected · Instantly persists to live Supabase database
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
              {calendarDays.map(slot => {
                const isOverdueSlot = slot.key === 'overdue';
                const itemsInSlot = isOverdueSlot
                  ? sorted.filter(a => a.evc < 0)
                  : sorted.filter(a => Math.floor(a.evc) === slot.dayOffset);
                const isOver = dragOverDay === slot.key;

                return (
                  <div
                    key={slot.key}
                    className={`panel ${isOver ? 'cal-slot-drop-active' : ''}`}
                    style={{
                      background: isOverdueSlot ? 'var(--red-bg)' : 'var(--surface-2)',
                      border: isOver ? '2px dashed var(--primary)' : '1px solid var(--border)',
                      borderRadius: 8,
                      padding: 10,
                      minHeight: 130,
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'background var(--dur-fast), border-color var(--dur-fast)',
                    }}
                    onDragOver={e => {
                      e.preventDefault();
                      setDragOverDay(slot.key);
                    }}
                    onDragLeave={() => setDragOverDay(null)}
                    onDrop={e => {
                      e.preventDefault();
                      handleDropOnDay(slot.key);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: isOverdueSlot ? 'var(--red)' : 'var(--text)' }}>
                        {slot.label}
                      </span>
                      <span className="tabnum" style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--surface)', padding: '1px 6px', borderRadius: 99 }}>
                        {itemsInSlot.length}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                      {itemsInSlot.map(a => (
                        <div
                          key={a.id}
                          draggable={true}
                          onDragStart={e => {
                            e.dataTransfer.setData('text/plain', a.id);
                            setDraggedAppId(a.id);
                          }}
                          onDragEnd={() => {
                            setDraggedAppId(null);
                            setDragOverDay(null);
                          }}
                          style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 6,
                            padding: '6px 8px',
                            cursor: 'grab',
                            boxShadow: 'var(--shadow-sm)',
                            userSelect: 'none',
                          }}
                          title={`Drag to reschedule ${a.id} (${a.inst})`}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 11, color: 'var(--primary)' }}>
                              {a.id}
                            </span>
                            <span className="chip chip-grey" style={{ fontSize: 9, padding: '1px 5px' }}>{a.reg}</span>
                          </div>
                          <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {a.inst}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 10.5, color: a.evc < 0 ? 'var(--red)' : 'var(--muted)' }}>
                            <Clock size={10} />
                            <span className="tabnum">{a.evc < 0 ? `${Math.abs(a.evc)}d overdue` : `${a.evc}d remaining`}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>App ID</th>
                  <th>Institution</th>
                  <th>Region</th>
                  <th>Visit Due</th>
                  <th>Escalation</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(a => (
                  <tr key={a.id} style={{ background: a.evc < -7 ? 'var(--red-bg)' : undefined }}>
                    <td><span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>{a.id}</span></td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{a.inst}</div>
                    </td>
                    <td><span className="chip chip-grey">{a.reg}</span></td>
                    <td><StatusChip days={a.evc} /></td>
                    <td><LevelChip days={a.evc} /></td>
                    <td>
                      <button
                        className="btn btn-secondary btn-xs"
                        onClick={() => {
                          setRescheduleTarget(a);
                          setSelectedTargetDays(a.evc > 0 ? a.evc + 7 : 7);
                          setIsCustomDays(false);
                          setCustomDays('');
                        }}
                        style={{ gap: 4 }}
                        title={`Reschedule inspection for ${a.id}`}
                      >
                        <Calendar size={12} /> Reschedule
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Reschedule Dialog */}
      {rescheduleTarget && (
        <ConfirmDialog
          isOpen={!!rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onConfirm={handleConfirmReschedule}
          title={`Reschedule EVC: ${rescheduleTarget.id}`}
          message={
            <div>
              <p style={{ marginBottom: 12 }}>
                Reschedule Expert Visit Committee inspection for <strong>{rescheduleTarget.inst}</strong> ({rescheduleTarget.reg} Region).
              </p>
              <div style={{ marginBottom: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
                  Quick Preset:
                </span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { label: '+3 Days', days: 3 },
                    { label: '+7 Days (1 Wk)', days: 7 },
                    { label: '+14 Days (2 Wks)', days: 14 },
                    { label: '+21 Days (3 Wks)', days: 21 },
                  ].map(p => (
                    <button
                      key={p.days}
                      type="button"
                      className={`btn btn-xs ${!isCustomDays && selectedTargetDays === p.days ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => {
                        setSelectedTargetDays(p.days);
                        setIsCustomDays(false);
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`btn btn-xs ${isCustomDays ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setIsCustomDays(true)}
                  >
                    Custom Days…
                  </button>
                </div>
              </div>

              {isCustomDays && (
                <div style={{ marginTop: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>
                    Enter target days from today:
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    className="filter-search-input"
                    style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)' }}
                    placeholder="e.g. 10"
                    value={customDays}
                    onChange={e => setCustomDays(e.target.value)}
                    autoFocus
                  />
                </div>
              )}
            </div>
          }
          confirmLabel="Save Inspection Date"
        />
      )}

      <p style={{ marginTop: 14, fontSize: 12, color: 'var(--muted)' }}>
        Applications enter this queue automatically after preliminary scrutiny. Rescheduled inspection dates persist directly to the live Supabase cloud database.
      </p>
    </div>
  );
}
