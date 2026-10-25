import { useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';

interface HoverCardProps {
  content: ReactNode;
  children: (props: { ref: (el: HTMLElement | null) => void; onMouseEnter: () => void; onMouseLeave: () => void }) => ReactNode;
  delay?: number;
}

/**
 * Generic hover card: appears after `delay` ms (default 300ms), disappears on leave.
 * Positions itself so it never overflows the viewport edge.
 * Wraps children via render prop so no extra DOM elements are injected.
 */
export function HoverCard({ content, children, delay = 300 }: HoverCardProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const anchorRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cardW = 240;
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - cardW - 8));
      const top  = rect.bottom + 6;
      setPos({ top, left });
      setVisible(true);
    }, delay);
  }, [delay]);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const setRef = useCallback((el: HTMLElement | null) => { anchorRef.current = el; }, []);

  return (
    <>
      {children({ ref: setRef, onMouseEnter: show, onMouseLeave: hide })}
      {visible && (
        <div
          ref={cardRef}
          className="hover-card fade-in"
          style={{ top: pos.top, left: pos.left }}
          onMouseEnter={() => { if (timerRef.current) clearTimeout(timerRef.current); }}
          onMouseLeave={hide}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </>
  );
}
