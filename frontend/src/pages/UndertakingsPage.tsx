import React, { useState } from 'react';
import { Upload, CheckCircle, ClipboardCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusChip } from '../components/shared/StatusChip';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import type { UndertakingRecord } from '../types';

const STATUS_LABELS = ['Pending', 'Submitted', 'Verified'];

function StatusStepper({ status }: { status: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {STATUS_LABELS.map((s, i) => (
        <React.Fragment key={s}>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 6px',
            borderRadius: 6,
            background: i === status ? 'var(--accent)' : i < status ? 'var(--green-bg)' : 'var(--bg)',
            color: i === status ? 'white' : i < status ? 'var(--green)' : 'var(--muted-2)',
            border: `1px solid ${i === status ? 'var(--accent)' : i < status ? 'var(--green-border)' : 'var(--border)'}`,
          }}>
            {s}
          </span>
          {i < 2 && <span style={{ color: 'var(--muted-2)', fontSize: 10 }}>›</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

export function UndertakingsPage() {
  const { ul, U, handleUndertakingAction, actionLoading, searchQuery } = useApp();
  const [pendingAction, setPendingAction] = useState<{ idx: number; item: UndertakingRecord } | null>(null);

  const filtered = ul.filter(u => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return u.inst.toLowerCase().includes(q) || u.t.toLowerCase().includes(q);
  }).sort((a, b) => a.d - b.d);

  const handleAction = async () => {
    if (!pendingAction) return;
    await handleUndertakingAction(pendingAction.idx, pendingAction.item);
    setPendingAction(null);
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Undertakings</h1>
        <p>Time-bound compliance conditions · {ul.filter(u => u.s < 2).length} pending</p>
      </div>

      <div className="panel">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><ClipboardCheck size={40} /></div>
            <h3>No undertakings to display</h3>
            <p>All undertakings are either verified or filtered out.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Institution</th>
                  <th>Condition</th>
                  <th>Region</th>
                  <th>Status</th>
                  <th>Due</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const originalIdx = U.indexOf(u);
                  const isActing = actionLoading === `un-${originalIdx}`;
                  const isUpload = u.s === 0;

                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{u.inst}</div>
                      </td>
                      <td style={{ maxWidth: 220 }}>
                        <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{u.t}</span>
                      </td>
                      <td><span className="chip chip-grey">{u.reg}</span></td>
                      <td><StatusStepper status={u.s} /></td>
                      <td>
                        {u.s >= 2
                          ? <span className="chip chip-green">Closed</span>
                          : <StatusChip days={u.d} />
                        }
                      </td>
                      <td>
                        {u.s < 2 ? (
                          <button
                            className={`btn btn-sm ${isUpload ? 'btn-secondary' : 'btn-primary'}`}
                            onClick={() => setPendingAction({ idx: originalIdx, item: u })}
                            disabled={isActing}
                            aria-label={isUpload ? `Upload evidence for ${u.inst}` : `Verify undertaking for ${u.inst}`}
                          >
                            {isActing
                              ? 'Processing…'
                              : isUpload
                              ? <><Upload size={12} aria-hidden="true" /> Upload Evidence</>
                              : <><CheckCircle size={12} aria-hidden="true" /> Verify</>
                            }
                          </button>
                        ) : (
                          <span style={{ color: 'var(--green)', fontSize: 12 }}>✓ Verified</span>
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

      <ConfirmDialog
        isOpen={!!pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={handleAction}
        title={pendingAction?.item.s === 0 ? 'Upload Evidence' : 'Verify Undertaking'}
        message={
          pendingAction && (
            <>
              {pendingAction.item.s === 0
                ? <>Mark evidence as uploaded for <strong>{pendingAction.item.inst}</strong>: {pendingAction.item.t}?</>
                : <>Verify undertaking for <strong>{pendingAction.item.inst}</strong>: {pendingAction.item.t}? This marks the condition as fulfilled.</>
              }
            </>
          )
        }
        confirmLabel={pendingAction?.item.s === 0 ? 'Upload Evidence' : 'Verify'}
      />
    </div>
  );
}
