import { CheckCircle, AlertTriangle, Info, XCircle, X } from 'lucide-react';

export interface ToastData {
  id: string;
  title: string;
  message: string;
  type?: 'success' | 'warn' | 'info' | 'error';
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

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="region" aria-live="polite" aria-label="Notifications">
      {toasts.map(toast => {
        const type = toast.type || 'success';
        const Icon = ICONS[type];
        const color = COLORS[type];

        return (
          <div
            key={toast.id}
            className="toast"
            role="alert"
          >
            <div
              className="toast-accent"
              style={{ background: color }}
              aria-hidden="true"
            />
            <Icon
              size={16}
              style={{ color, flexShrink: 0, marginTop: 1 }}
              aria-hidden="true"
            />
            <div className="toast-body">
              <div className="toast-title">{toast.title}</div>
              <div className="toast-msg">{toast.message}</div>
            </div>
            <button
              className="toast-close"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
