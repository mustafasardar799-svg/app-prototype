import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, syncQueued } from './api';
import { getQueue, onReconnect, subscribe, type QueuedWrite } from './offline';

interface ConnectionValue {
  online: boolean;
  queue: QueuedWrite[];
  sync: () => Promise<void>;
}

const ConnectionContext = createContext<ConnectionValue | null>(null);

/**
 * Tracks connectivity and drains the offline write queue whenever the phone
 * comes back. `navigator.onLine` lies about captive portals, so a successful
 * health call is what actually promotes us back to "online".
 */
export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [queue, setQueue] = useState<QueuedWrite[]>(getQueue);

  useEffect(() => {
    const unsubscribe = subscribe(setQueue);
    return () => {
      unsubscribe();
    };
  }, []);

  const sync = useMemo(
    () => async () => {
      if (getQueue().length === 0) return;
      await syncQueued();
    },
    [],
  );

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      void sync();
    };
    const goOffline = () => setOnline(false);
    const stopReconnect = onReconnect(goOnline);
    window.addEventListener('offline', goOffline);

    // Drain anything left over from a previous session on first load.
    if (navigator.onLine) void sync();

    return () => {
      stopReconnect();
      window.removeEventListener('offline', goOffline);
    };
  }, [sync]);

  // A periodic ping catches the captive-portal case the online event misses.
  useEffect(() => {
    if (online || queue.length === 0) return;
    const timer = setInterval(() => {
      fetch('/api/health', { cache: 'no-store' })
        .then(() => {
          setOnline(true);
          void sync();
        })
        .catch(() => undefined);
    }, 15000);
    return () => clearInterval(timer);
  }, [online, queue.length, sync]);

  const value = useMemo(() => ({ online, queue, sync }), [online, queue, sync]);
  return <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>;
}

export function useConnection() {
  const value = useContext(ConnectionContext);
  if (!value) throw new Error('useConnection must be used inside ConnectionProvider');
  return value;
}

export { api };
