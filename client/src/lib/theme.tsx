import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark';

const THEME_KEY = 'eliavit.theme';

interface ThemeValue {
  choice: ThemeChoice;
  setChoice: (choice: ThemeChoice) => void;
  resolved: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeValue | null>(null);

function readChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(readChoice);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
  );

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!query) return;
    const listen = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener('change', listen);
    return () => query.removeEventListener('change', listen);
  }, []);

  const resolved = choice === 'system' ? (systemDark ? 'dark' : 'light') : choice;

  useEffect(() => {
    const root = document.documentElement;
    if (choice === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', choice);
    // Keep the iOS status bar in step with the app's own background.
    document
      .querySelector('meta[name="theme-color"]:not([media])')
      ?.setAttribute('content', resolved === 'dark' ? '#131126' : '#6c4cf1');
  }, [choice, resolved]);

  const setChoice = useCallback((next: ThemeChoice) => {
    setChoiceState(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // A blocked store just means the choice does not outlive the session.
    }
  }, []);

  const value = useMemo(() => ({ choice, setChoice, resolved }), [choice, setChoice, resolved]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
