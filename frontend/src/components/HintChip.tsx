import { useState } from 'react';
import { Lightbulb, X } from 'lucide-react';

interface HintChipProps {
  id: string;
  children: React.ReactNode;
}

export function HintChip({ id, children }: HintChipProps) {
  const storageKey = `aicte_hint_${id}`;
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === 'dismissed';
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(storageKey, 'dismissed');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="hint-chip" role="note" aria-label="Helpful tip">
      <div className="hint-chip-content">
        <Lightbulb size={15} style={{ color: 'var(--amber)', flexShrink: 0 }} aria-hidden="true" />
        <div>{children}</div>
      </div>
      <button
        className="hint-chip-dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss tip"
        title="Dismiss tip"
      >
        <X size={14} />
      </button>
    </div>
  );
}
