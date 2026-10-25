import React, { useState } from 'react';
import { Upload, CheckCircle, FileSignature } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusChip } from '../components/shared/StatusChip';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import type { DocumentRecord } from '../types';

function StatusStepper({ status, isExpired }: { status: number; isExpired: boolean }) {
  const steps = ['Pending', 'Submitted', 'Renewed'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 6px',
            borderRadius: 6,
            background: i === status ? (isExpired && i === 0 ? 'var(--red)' : 'var(--accent)') : i < status ? 'var(--green-bg)' : 'var(--bg)',
            color: i === status ? 'white' : i < status ? 'var(--green)' : 'var(--muted-2)',
            border: `1px solid ${i === status ? (isExpired && i === 0 ? 'var(--red)' : 'var(--accent)') : i < status ? 'var(--green-border)' : 'var(--border)'}`,
          }}>
            {i === 0 && isExpired ? 'Expired' : s}
          </span>
          {i < 2 && <span style={{ color: 'var(--muted-2)', fontSize: 10 }}>›</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

export function DocumentsPage() {
  const { dl, D, handleDocumentAction, actionLoading, searchQuery } = useApp();
  const [pendingAction, setPendingAction] = useState<{ idx: number; item: DocumentRecord } | null>(null);

  const filtered = dl
    .filter(d => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return d.inst.toLowerCase().includes(q) || d.t.toLowerCase().includes(q);
    })
    .sort((a, b) => a.d - b.d);

  const handleAction = async () => {
    if (!pendingAction) return;
    await handleDocumentAction(pendingAction.idx, pendingAction.item);
    setPendingAction(null);
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Lease & Documents</h1>
        <p>Lease deeds and compliance documents · {dl.filter(d => d.s < 2).length} active</p>
      </div>

      <div className="panel">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><FileSignature size={40} /></div>
            <h3>No documents to display</h3>
            <p>All documents are either renewed or filtered out.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Institution</th>
                  <th>Document</th>
                  <th>Region</th>
                  <th>Status</th>
                  <th>Expiry</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => {
                  const originalIdx = D.indexOf(d);
                  const isActing = actionLoading === `dc-${originalIdx}`;
                  const isUpload = d.s === 0;
                  const isExpired = d.d < 0 && d.s < 2;

                  return (
                    <tr key={d.id} style={{ background: isExpired ? 'var(--red-bg)' : undefined }}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{d.inst}</div>
                      </td>
                      <td style={{ maxWidth: 200 }}>
                        <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{d.t}</span>
                      </td>
                      <td><span className="chip chip-grey">{d.reg}</span></td>
                      <td>
                        <StatusStepper status={d.s} isExpired={isExpired} />
                      </td>
                      <td>
                        {d.s >= 2
                          ? <span className="chip chip-green">Renewed</span>
                          : <StatusChip days={d.d} />
                        }
                      </td>
                      <td>
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
                          <span style={{ color: 'var(--green)', fontSize: 12 }}>✓ Renewed (+365d)</span>
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
        title={pendingAction?.item.s === 0 ? 'Upload Document' : 'Verify & Renew Document'}
        message={
          pendingAction && (
            <>
              {pendingAction.item.s === 0
                ? <>Mark document as uploaded for <strong>{pendingAction.item.inst}</strong>: {pendingAction.item.t}?</>
                : <>Verify and renew <strong>{pendingAction.item.t}</strong> for <strong>{pendingAction.item.inst}</strong>? This will add <strong>+365 days</strong> to the validity period.</>
              }
            </>
          )
        }
        confirmLabel={pendingAction?.item.s === 0 ? 'Upload' : 'Verify & Renew (+365d)'}
      />
    </div>
  );
}
