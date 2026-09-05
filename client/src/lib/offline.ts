/**
 * Offline write queue.
 *
 * A medical rep is often in a basement pharmacy or a village with no signal.
 * Instead of losing the order they just took, failed writes are parked in
 * localStorage and replayed, in order, the moment the connection returns.
 *
 * Only writes queue. Reads fail normally — showing stale figures as if they
 * were live would be worse than showing nothing.
 */

const QUEUE_KEY = 'eliavit.queue';

export interface QueuedWrite {
  id: string;
  path: string;
  method: string;
  body: string;
  /** Translation key naming what was queued, e.g. 'queueOrder'. */
  label: string;
  queuedAt: string;
}

type Listener = (queue: QueuedWrite[]) => void;

const listeners = new Set<Listener>();

function read(): QueuedWrite[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedWrite[]) : [];
  } catch {
    return [];
  }
}

function write(queue: QueuedWrite[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // A full or blocked store means we cannot promise a later replay; the
    // caller has already been told the write did not reach the server.
  }
  listeners.forEach((listener) => listener(queue));
}

export const getQueue = read;

export function subscribe(listener: Listener) {
  listeners.add(listener);
  listener(read());
  return () => listeners.delete(listener);
}

export function enqueue(entry: Omit<QueuedWrite, 'id' | 'queuedAt'>) {
  const queued: QueuedWrite = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    queuedAt: new Date().toISOString(),
  };
  write([...read(), queued]);
  return queued;
}

export function clearQueue() {
  write([]);
}

let flushing = false;

/**
 * Replay queued writes oldest first. Stops at the first network failure so
 * ordering is preserved; a write the server rejects outright (a 4xx — bad
 * data, or a record deleted meanwhile) is dropped rather than retried forever.
 */
export async function flushQueue(
  send: (entry: QueuedWrite) => Promise<Response>,
): Promise<{ sent: number; failed: number }> {
  if (flushing || !navigator.onLine) return { sent: 0, failed: 0 };
  flushing = true;
  let sent = 0;
  let failed = 0;

  try {
    let queue = read();
    while (queue.length > 0) {
      const [next, ...rest] = queue;
      try {
        const response = await send(next);
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          if (!response.ok) failed += 1;
          else sent += 1;
          queue = rest;
          write(queue);
        } else {
          break; // server trouble — keep it queued and try again later
        }
      } catch {
        break; // still offline
      }
    }
  } finally {
    flushing = false;
  }
  return { sent, failed };
}

/** Fires the callback whenever the browser regains connectivity. */
export function onReconnect(callback: () => void) {
  window.addEventListener('online', callback);
  return () => window.removeEventListener('online', callback);
}
