import { Bell, Play } from 'lucide-react';
import { useApp, alertLevel } from '../context/AppContext';
import { StatusChip } from '../components/shared/StatusChip';

type Level = 'L3' | 'L2' | 'L1';

const LEVEL_INFO: Record<Level, { label: string; desc: string; notified: string; colorClass: string }> = {
  L3: {
    label: 'L3 — Critical',
    desc: 'Overdue by more than 7 days',
    notified: 'Bureau + Regional Officer notified immediately',
    colorClass: 'chip-l3',
  },
  L2: {
    label: 'L2 — Overdue',
    desc: 'Past SLA deadline (1–7 days overdue)',
    notified: 'Regional Officer notified',
    colorClass: 'chip-l2',
  },
  L1: {
    label: 'L1 — Due Soon',
    desc: 'Due within the next 15 days',
    notified: 'Institution reminded automatically',
    colorClass: 'chip-l1',
  },
};

export function EscalationsPage() {
  const { urgencyItems, actionLoading, handleSweep } = useApp();
  const isSweeping = actionLoading === 'sweep';

  const grouped: Record<Level, typeof urgencyItems> = {
    L3: urgencyItems.filter(x => alertLevel(x.d) === 'L3'),
    L2: urgencyItems.filter(x => alertLevel(x.d) === 'L2'),
    L1: urgencyItems.filter(x => alertLevel(x.d) === 'L1'),
  };

  return (
    <div className="page-content">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1>Escalations</h1>
          <p>Alerts and escalation ladder · {Object.values(grouped).flat().length} active items</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleSweep}
          disabled={isSweeping}
          aria-label="Run escalation alert sweep across all items"
        >
          <Play size={14} aria-hidden="true" />
          {isSweeping ? 'Running Sweep…' : 'Run Alert Sweep'}
        </button>
      </div>

      {/* Escalation ladder explanation */}
      <div className="panel mb-4" style={{ padding: 16 }}>
        <div className="panel-title" style={{ marginBottom: 12 }}>
          <Bell size={14} aria-hidden="true" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
          Escalation Ladder
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {(['L3', 'L2', 'L1'] as Level[]).map(lvl => {
            const info = LEVEL_INFO[lvl];
            return (
              <div key={lvl} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span className={`chip ${info.colorClass}`}>{lvl}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{info.label.split('—')[1].trim()}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>{info.desc}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>📬 {info.notified}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grouped items */}
      {(['L3', 'L2', 'L1'] as Level[]).map(lvl => {
        const items = grouped[lvl];
        if (items.length === 0) return null;
        const info = LEVEL_INFO[lvl];

        return (
          <div key={lvl} className="escalation-group mb-4">
            <div className="escalation-group-header">
              <span className={`chip ${info.colorClass}`}>{lvl}</span>
              <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{info.label}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)', flex: 1 }}>{info.desc}</span>
              <span className="tabnum" style={{ fontWeight: 700, fontSize: 18 }}>{items.length}</span>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Institution</th>
                    <th>Region</th>
                    <th>Timeline</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((x, i) => (
                    <tr key={i}>
                      <td>
                        <span style={{ fontWeight: 500, color: 'var(--text)' }}>
                          {x.kind}{x.stage ? ` · ${x.stage}` : ''}
                        </span>
                      </td>
                      <td style={{ maxWidth: 220 }}>
                        <span style={{ display: 'block' }} className="truncate">{x.inst}</span>
                      </td>
                      <td><span className="chip chip-grey">{x.reg}</span></td>
                      <td><StatusChip days={x.d} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {Object.values(grouped).flat().length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon"><Bell size={40} /></div>
          <h3>No active escalations</h3>
          <p>All items are within acceptable SLA thresholds. Run an alert sweep to check for new escalations.</p>
        </div>
      )}

      <p style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
        L1: reminder to institution within 15 days · L2: Regional officer notified when overdue ·
        L3: Bureau escalation when overdue by more than 7 days. Thresholds are configurable via APH Rules.
      </p>
    </div>
  );
}
