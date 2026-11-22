import { useEffect, useRef } from 'react';

export type ActionPrompt = {
  eyebrow: string;
  title: string;
  message: string;
  confirmLabel: string;
  details?: string[];
  danger?: boolean;
};

export function ActionModal({ prompt, onClose, onConfirm }: {
  prompt: ActionPrompt | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const open = !!prompt;

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
      if (event.key === 'Tab') {
        const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || []);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [open]);

  if (!prompt) return null;
  return <div className="app-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="app-modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="app-modal-title" aria-describedby="app-modal-description">
      <div className="app-modal-top"><span className="app-kicker">{prompt.eyebrow}</span><button type="button" className="app-modal-x" aria-label="Cerrar ventana" onClick={onClose}>×</button></div>
      <h2 id="app-modal-title">{prompt.title}<span className="app-period">.</span></h2>
      <p id="app-modal-description">{prompt.message}</p>
      {prompt.details && <ul>{prompt.details.map(detail => <li key={detail}>{detail}</li>)}</ul>}
      <div className="app-modal-actions">
        <button type="button" className="app-modal-cancel" ref={cancelRef} onClick={onClose}>CANCELAR</button>
        <button type="button" className={prompt.danger ? 'danger' : undefined} onClick={onConfirm}>{prompt.confirmLabel} ↗</button>
      </div>
    </div>
  </div>;
}
