import { useState, useEffect, useRef } from 'react';
import { CheckCircle, AlertTriangle, Info, XCircle, X } from 'lucide-react';

export interface ToastData {
  id: string;
  title: string;
  message: string;
  type?: 'success' | 'warn' | 'info' | 'error';
  /** Duration in ms before auto-dismiss. Default 4000. */
  duration?: number;
  /** Undo label + callback */
  undoLabel?: string;
  onUndo?: () => void;
}

const ICONS = {
  success: CheckCircle,
  warn:    AlertTriangle,
  info:    Info,
  error:   XCircle,
} as const;

const COLORS = {
  success: 'var(--green)',
  warn:    'var(--amber)',
  info:    'var(--blue)',
  error:   'var(--red)',
} as const;

interface ToastItemProps extends ToastData {
  onDismiss: (id: string) => void;
}

const DURATION = 4000;

function ToastItem({ id, title, message, type = 'success', duration = DURATION, undoLabel, onUndo, onDismiss }: ToastItemProps) {
  const Icon = ICONS[type];
  const color = COLORS[type];
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  const elapsedRef = useRef(0);

  // Countdown + auto-dismiss
  useEffect(() => {
    if (paused) return;
    const tick = () => {
      elapsedRef.current = Date.now() - startRef.current;
      setElapsed(elapsedRef.current);
      if (elapsedRef.current >= duration) onDismiss(id);
    };
    const iv = setInterval(tick, 100);
    return () => clearInterval(iv);
  }, [paused, id, duration, onDismiss]);

  // Reset startRef when unpaused
  useEffect(() => {
    if (!paused) startRef.current = Date.now() - elapsedRef.current;
  }, [paused]);

  const progress = Math.max(0, 1 - elapsed / duration);

  const handleUndo = () => {
    onUndo?.();
    onDismiss(id);
  };

  return (
    <div
      className="toast"
      role="alert"
      aria-live="assertive"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      <div className="toast-accent" style={{ background: color }} aria-hidden="true" />
      <Icon size={16} style={{ color, flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
      <div className="toast-body">
        <div className="toast-title">{title}</div>
        <div className="toast-msg">{message}</div>
        {undoLabel && onUndo && (
          <button
            className="toast-undo"
            onClick={handleUndo}
            style={{ marginTop: 4, fontSize: 11.5, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}
          >
            {undoLabel}
          </button>
        )}
      </div>
      <button className="toast-close" onClick={() => onDismiss(id)} aria-label="Dismiss notification">
        <X size={14} />
      </button>
      {/* Countdown bar */}
      <div
        className="toast-countdown"
        style={{
          transform: `scaleX(${progress})`,
          background: color,
          transition: paused ? 'none' : 'transform 100ms linear',
        }}
        aria-hidden="true"
      />
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="region" aria-label="Notifications">
      {toasts.map(toast => (
        <ToastItem key={toast.id} {...toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

/** Re-export ToastItem type for use in AppContext */
export type { ToastItemProps };
