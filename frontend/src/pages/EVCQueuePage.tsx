import { useState } from 'react';
import { Calendar, Table, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusChip, LevelChip } from '../components/shared/StatusChip';

export function EVCQueuePage() {
  const { evcs, searchQuery, handleRescheduleEVC, showToast } = useApp();
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | 'overdue' | null>(null);

  const sorted = [...evcs]
    .filter(a => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return a.inst.toLowerCase().includes(q) || a.id.toLowerCase().includes(q);
    })
    .sort((a, b) => a.evc - b.evc);

  const overdue   = sorted.filter(a => a.evc < 0);
  const dueSoon   = sorted.filter(a => a.evc >= 0 && a.evc <= 15);
  const scheduled = sorted.filter(a => a.evc > 15);

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
          <h1>EVC Queue</h1>
          <p>Expert Visit Committee inspections · {evcs.length} pending</p>
        </div>

        {/* View Mode Toggle */}
        <div style={{ display: 'inline-flex', background: 'var(--surface-2)', padding: 3, borderRadius: 8, border: '1px solid var(--border)' }}>
          <button
            className={`btn btn-xs ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('table')}
            style={{ borderRadius: 6, gap: 5 }}
            aria-pressed={viewMode === 'table'}
          >
            <Table size={13} /> Table
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

      {/* Summary strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="panel" style={{ flex: 1, minWidth: 140, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Overdue Visits</div>
          <div className="tabnum" style={{ fontSize: 28, fontWeight: 700, color: overdue.length > 0 ? 'var(--red)' : 'var(--text)' }}>{overdue.length}</div>
        </div>
        <div className="panel" style={{ flex: 1, minWidth: 140, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Due within 15d</div>
          <div className="tabnum" style={{ fontSize: 28, fontWeight: 700, color: dueSoon.length > 0 ? 'var(--amber)' : 'var(--text)' }}>{dueSoon.length}</div>
        </div>
        <div className="panel" style={{ flex: 1, minWidth: 140, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Scheduled</div>
          <div className="tabnum" style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>{scheduled.length}</div>
        </div>
      </div>

      <div className="panel">
        {sorted.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Calendar size={40} /></div>
            <h3>No EVC inspections in queue</h3>
            <p>Applications enter this queue automatically after preliminary scrutiny.</p>
          </div>
        ) : viewMode === 'calendar' ? (
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                Drag an inspection card to any day slot to reschedule
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                Past dates rejected · Instant SLA update with Undo
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p style={{ marginTop: 14, fontSize: 12, color: 'var(--muted)' }}>
        Applications enter this queue automatically after preliminary scrutiny. Switch to Calendar Schedule to drag and reschedule expert visit dates.
      </p>
    </div>
  );
}
