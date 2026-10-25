import React, { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, Info } from 'lucide-react';
import type { AphRulesConfig } from '../types';

interface AphRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRules: AphRulesConfig;
  onSave: (newRules: AphRulesConfig) => Promise<void>;
  role: string;
}

export const AphRulesModal: React.FC<AphRulesModalProps> = ({
  isOpen,
  onClose,
  currentRules,
  onSave,
  role,
}) => {
  const [scrutiny, setScrutiny] = useState(currentRules.Scrutiny || 15);
  const [evc, setEvc] = useState(currentRules.EVC || 30);
  const [sacShc, setSacShc] = useState(currentRules['SAC/SHC'] || 20);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const isBureau = role === 'Bureau';

  useEffect(() => {
    if (isOpen) {
      setScrutiny(currentRules.Scrutiny || 15);
      setEvc(currentRules.EVC || 30);
      setSacShc(currentRules['SAC/SHC'] || 20);
      setError(null);
      setTimeout(() => closeRef.current?.focus(), 50);
    }
  }, [isOpen, currentRules]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBureau) {
      setError('Only Bureau administrators can modify statutory APH SLA rules.');
      return;
    }
    if (scrutiny <= 0 || evc <= 0 || sacShc <= 0) {
      setError('SLA days must be positive integers greater than zero.');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await onSave({ Scrutiny: Number(scrutiny), EVC: Number(evc), 'SAC/SHC': Number(sacShc) });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save APH rules.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setScrutiny(15);
    setEvc(30);
    setSacShc(20);
    setError(null);
  };

  const fields: { id: string; label: string; hint: string; value: number; setter: (v: number) => void }[] = [
    { id: 'scrutiny-sla', label: 'Scrutiny SLA', hint: 'Initial document verification & scrutiny committee', value: scrutiny, setter: setScrutiny },
    { id: 'evc-sla',      label: 'EVC SLA',      hint: 'Physical/hybrid inspection & verification report upload', value: evc, setter: setEvc },
    { id: 'sac-sla',      label: 'SAC / SHC SLA', hint: 'Standing Appellate / Standing Hearing Committee review', value: sacShc, setter: setSacShc },
  ];

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="aph-modal-title"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal">
        <div className="modal-header">
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
              Approval Process Handbook · 2026-27
            </div>
            <h2 id="aph-modal-title" className="modal-title" style={{ fontSize: 16 }}>
              Configurable APH SLA Rules
            </h2>
          </div>
          <button ref={closeRef} className="icon-btn" onClick={onClose} aria-label="Close dialog" disabled={saving}>
            <X size={15} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.5 }}>
            Configure statutory processing SLA days. Overdue thresholds, urgency ranks, and escalation triggers (L1, L2, L3) update dynamically.
          </p>

          {!isBureau && (
            <div className="alert alert-warn" style={{ marginBottom: 16 }}>
              <AlertTriangle size={14} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                <strong>Read-only: </strong>Role <em>{role}</em> cannot edit statutory SLA days. Switch to Bureau to modify.
              </span>
            </div>
          )}

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>
              <AlertTriangle size={14} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{error}</span>
            </div>
          )}

          <form id="aph-form" onSubmit={handleSave}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {fields.map(f => (
                <div key={f.id}>
                  <label htmlFor={f.id} className="form-label">{f.label}</label>
                  <span className="form-hint">{f.hint}</span>
                  <div className="aph-input-group" style={{ marginTop: 6 }}>
                    <input
                      id={f.id}
                      type="number"
                      className="form-input"
                      min={1}
                      max={180}
                      disabled={!isBureau || saving}
                      value={f.value}
                      onChange={e => f.setter(parseInt(e.target.value) || 0)}
                      required
                      style={{ width: 80, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
                    />
                    <span className="input-addon">days</span>
                  </div>
                </div>
              ))}
            </div>
          </form>

          <div className="alert alert-info" style={{ marginTop: 16 }}>
            <Info size={14} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 12 }}>
              L1 alert: institution reminder ≤15 days before SLA · L2: regional officer when overdue · L3: Bureau when overdue &gt;7 days.
            </span>
          </div>
        </div>

        <div className="modal-footer">
          {isBureau && (
            <button className="btn btn-ghost btn-sm" type="button" onClick={handleReset} disabled={saving}>
              Reset to Defaults
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn btn-secondary btn-sm" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          {isBureau && (
            <button className="btn btn-primary btn-sm" type="submit" form="aph-form" disabled={saving}>
              {saving ? 'Saving…' : 'Save SLA Rules'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
