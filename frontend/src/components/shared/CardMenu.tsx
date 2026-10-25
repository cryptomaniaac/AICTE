import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';

export interface CardMenuItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface CardMenuProps {
  items: CardMenuItem[];
  label?: string;
}

/** The "..." menu shown at the top-right of every card. */
export function CardMenu({ items, label = 'Card options' }: CardMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="card-menu-wrap" ref={wrapRef}>
      <button
        className="card-menu-btn"
        onClick={() => setOpen(o => !o)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
      >
        <MoreHorizontal size={18} strokeWidth={1.5} aria-hidden="true" />
      </button>

      {open && (
        <div className="card-menu" role="menu">
          {items.map(item => (
            <button
              key={item.label}
              className="card-menu-item"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
