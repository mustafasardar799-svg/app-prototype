import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiError, api, clearToken, getToken, setToken, type User } from './api';

const USER_KEY = 'eliavit.user';

/** The last profile we saw, so the app opens signed in with no connection. */
function readCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function cacheUser(user: User | null) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    // Without a cache the app simply needs a connection to open; not fatal.
  }
}

interface AuthValue {
  user: User | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  register: (body: { username: string; password: string; name: string; phone?: string }) => Promise<void>;
  signOut: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Start from the cached profile so an offline launch lands on the app,
  // not on the sign-in screen.
  const [user, setUser] = useState<User | null>(() => (getToken() ? readCachedUser() : null));
  const [loading, setLoading] = useState(true);

  const remember = useCallback((next: User | null) => {
    setUser(next);
    cacheUser(next);
  }, []);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(remember)
      .catch((error) => {
        // A rejected token signs us out; an unreachable server does not —
        // the rep keeps working against the cached profile.
        const offline = error instanceof ApiError && error.status === 0;
        if (!offline) {
          clearToken();
          remember(null);
        }
      })
      .finally(() => setLoading(false));
  }, [remember]);

  const signIn = useCallback(
    async (username: string, password: string) => {
      const { token, user: signedIn } = await api.login(username, password);
      setToken(token);
      remember(signedIn);
    },
    [remember],
  );

  const register = useCallback(
    async (body: { username: string; password: string; name: string; phone?: string }) => {
      const { token, user: created } = await api.register(body);
      setToken(token);
      remember(created);
    },
    [remember],
  );

  const signOut = useCallback(() => {
    clearToken();
    remember(null);
  }, [remember]);

  const refresh = useCallback(async () => {
    remember(await api.me());
  }, [remember]);

  const value = useMemo(
    () => ({ user, loading, signIn, register, signOut, refresh }),
    [user, loading, signIn, register, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

export const isManagerial = (user: User | null) => user?.role === 'manager' || user?.role === 'supervisor';
