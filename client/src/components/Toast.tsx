import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { IconCheck, IconClose, IconInfo } from './Icons';

type ToastKind = 'ok' | 'error' | 'info';
interface Toast { id: number; kind: ToastKind; text: string }

const ToastContext = createContext<((text: string, kind?: ToastKind) => void) | null>(null);

/** Replaces alert() — a native dialog blocks the whole app and looks wrong on iOS. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((text: string, kind: ToastKind = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, kind, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 3600);
  }, []);

  const icons = { ok: <IconCheck size={18} />, error: <IconClose size={18} />, info: <IconInfo size={18} /> };

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.kind}`}>
            {icons[toast.kind]}
            <span>{toast.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast must be used inside ToastProvider');
  return show;
}
