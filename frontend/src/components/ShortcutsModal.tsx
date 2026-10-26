import { useEffect, useRef } from 'react';
import { X, Keyboard, Navigation, Table, Sparkles } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sections = [
    {
      title: 'Navigation (Press G then key)',
      icon: Navigation,
      items: [
        { key: 'G then D', desc: 'Go to Overview Dashboard' },
        { key: 'G then A', desc: 'Go to Applications Queue' },
        { key: 'G then E', desc: 'Go to EVC Inspection Queue' },
        { key: 'G then S', desc: 'Go to Escalations & Alerts' },
        { key: 'G then L', desc: 'Go to System Audit Trail' },
      ],
    },
    {
      title: 'Table & List Power',
      icon: Table,
      items: [
        { key: 'j / ↓', desc: 'Move focus to next item / row' },
        { key: 'k / ↑', desc: 'Move focus to previous item / row' },
        { key: 'x', desc: 'Toggle multi-select on focused row' },
        { key: 'Space', desc: 'Preview or open drawer for selection' },
        { key: 'Right Click', desc: 'Open contextual action menu' },
        { key: 'Shift + Click', desc: 'Multi-select contiguous range' },
      ],
    },
    {
      title: 'Global Shortcuts',
      icon: Sparkles,
      items: [
        { key: '⌘ / Ctrl + K', desc: 'Open Omni Command Palette' },
        { key: '/', desc: 'Quick focus search field' },
        { key: '?', desc: 'Toggle this keyboard shortcuts cheat-sheet' },
        { key: 'Esc', desc: 'Close any active drawer, modal, or menu' },
      ],
    },
  ];

  return (
    <div
      className="cmd-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="cmd-palette shortcuts-dialog scale-in" style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--primary-50)', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Keyboard size={18} />
            </div>
            <div>
              <h2 id="shortcuts-title" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                Keyboard Shortcuts
              </h2>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
                Navigate and operate the regulatory console at high speed
              </p>
            </div>
          </div>
          <button ref={closeRef} className="icon-btn" onClick={onClose} aria-label="Close shortcuts">
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxHeight: '65vh', overflowY: 'auto', paddingRight: 4 }}>
          {sections.map(section => {
            const Icon = section.icon;
            return (
              <div key={section.title}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
                  <Icon size={13} />
                  <span>{section.title}</span>
                </div>
                <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '4px 14px', border: '1px solid var(--border)' }}>
                  {section.items.map(item => (
                    <div key={item.key} className="shortcut-row">
                      <span>{item.desc}</span>
                      <kbd className="shortcut-key">{item.key}</kbd>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 20, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary btn-sm" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
