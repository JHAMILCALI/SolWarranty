import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { explorerUrl } from '../solana/config';

type NoticeKind = 'pending' | 'success' | 'error' | 'info';
type NoticeInput = { kind: NoticeKind; title: string; message: string; signature?: string };
type Notice = NoticeInput & { id: number };

const NotificationContext = createContext<((notice: NoticeInput) => void) | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const nextId = useRef(0);
  const notify = useCallback((input: NoticeInput) => {
    setNotice({ ...input, id: ++nextId.current });
  }, []);

  useEffect(() => {
    if (!notice || notice.kind === 'pending') return;
    const timer = window.setTimeout(() => setNotice(current => current?.id === notice.id ? null : current), 9000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return <NotificationContext.Provider value={notify}>
    {children}
    {notice && <div className={`app-notice app-notice-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'} aria-live={notice.kind === 'error' ? 'assertive' : 'polite'}>
      <span className="app-notice-icon" aria-hidden="true">{notice.kind === 'pending' ? '◌' : notice.kind === 'success' ? '✓' : notice.kind === 'error' ? '!' : 'i'}</span>
      <div className="app-notice-body">
        <strong>{notice.title}</strong>
        <p>{notice.message}</p>
        {notice.signature && <a href={explorerUrl(notice.signature)} target="_blank" rel="noreferrer">VER EN SOLANA EXPLORER ↗</a>}
      </div>
      <button type="button" className="app-notice-close" aria-label="Cerrar aviso" onClick={() => setNotice(null)}>×</button>
    </div>}
  </NotificationContext.Provider>;
}

export function useNotifications() {
  const notify = useContext(NotificationContext);
  if (!notify) throw new Error('Las notificaciones requieren NotificationsProvider.');
  return notify;
}
