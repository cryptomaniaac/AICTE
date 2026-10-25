import { Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusChip, LevelChip } from '../components/shared/StatusChip';

export function EVCQueuePage() {
  const { evcs, searchQuery } = useApp();

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

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>EVC Queue</h1>
        <p>Expert Visit Committee inspections · {evcs.length} pending</p>
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
        Applications enter this queue automatically after preliminary scrutiny. Sorted by urgency.
      </p>
    </div>
  );
}
