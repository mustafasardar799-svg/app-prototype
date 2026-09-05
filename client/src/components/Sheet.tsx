import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

/** Bottom sheet — the iOS-native way to present a form over the current screen. */
export function Sheet({
  title, onClose, children,
}: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    // Stop the page behind from scrolling while the sheet is up.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  // Rendered at the document root: the page's entry animation forms a stacking
  // context, which would otherwise trap the sheet under the tab bar.
  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-grip" />
        <h2>{title}</h2>
        {children}
      </div>
    </>,
    document.body,
  );
}

/** Replaces confirm() for destructive actions. */
export function ConfirmSheet({
  title, message, confirmLabel = 'Delete', onConfirm, onCancel, busy,
}: {
  title: string; message: string; confirmLabel?: string;
  onConfirm: () => void; onCancel: () => void; busy?: boolean;
}) {
  return (
    <Sheet title={title} onClose={onCancel}>
      <p style={{ margin: '0 0 4px', color: 'var(--ink-soft)' }}>{message}</p>
      <div className="sheet-actions">
        <button className="btn ghost" onClick={onCancel}>Cancel</button>
        <button className="btn danger" onClick={onConfirm} disabled={busy}>
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}
