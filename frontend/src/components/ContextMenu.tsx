import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export interface ContextMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  separator?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Viewport bounds clamping
  const menuW = 200;
  const menuH = items.length * 34 + 10;
  const clampedX = Math.max(8, Math.min(x, window.innerWidth - menuW - 8));
  const clampedY = Math.max(8, Math.min(y, window.innerHeight - menuH - 8));

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: clampedX, top: clampedY }}
      role="menu"
      aria-label="Row actions"
    >
      {items.map((item, idx) => {
        if (item.separator) {
          return <div key={`sep-${idx}`} className="context-menu-sep" />;
        }
        return (
          <button
            key={item.label}
            className={`context-menu-item${item.danger ? ' danger' : ''}`}
            onClick={() => {
              onClose();
              item.onClick();
            }}
            role="menuitem"
          >
            {item.icon && <span style={{ display: 'inline-flex', opacity: 0.7 }}>{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
