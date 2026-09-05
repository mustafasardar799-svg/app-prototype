import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { en, type Dictionary } from '../locales/en';
import { ckb } from '../locales/ckb';
import { ar } from '../locales/ar';
import { setFormatLocale } from './format';

export type LocaleCode = 'en' | 'ckb' | 'ar';

export const locales: {
  code: LocaleCode;
  label: string;      // in its own language, so it is findable by its speakers
  english: string;
  dir: 'ltr' | 'rtl';
  intl: string;       // BCP 47 tag for Intl formatting
}[] = [
  { code: 'en', label: 'English', english: 'English', dir: 'ltr', intl: 'en-GB' },
  { code: 'ckb', label: 'کوردی', english: 'Kurdish (Sorani)', dir: 'rtl', intl: 'ckb-IQ' },
  { code: 'ar', label: 'العربية', english: 'Arabic', dir: 'rtl', intl: 'ar-IQ' },
];

const dictionaries: Record<LocaleCode, Dictionary> = { en, ckb, ar };
const LOCALE_KEY = 'eliavit.locale';

export type TranslateKey = keyof Dictionary;
export type Translate = (key: TranslateKey, vars?: Record<string, string | number>) => string;

interface I18nValue {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  dir: 'ltr' | 'rtl';
  intlTag: string;
  t: Translate;
}

const I18nContext = createContext<I18nValue | null>(null);

function detectLocale(): LocaleCode {
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    if (stored === 'en' || stored === 'ckb' || stored === 'ar') return stored;
  } catch {
    // Fall through to the browser's own preference.
  }
  const preferred = navigator.languages || [navigator.language];
  for (const tag of preferred) {
    const base = tag.toLowerCase();
    if (base.startsWith('ckb') || base.startsWith('ku')) return 'ckb';
    if (base.startsWith('ar')) return 'ar';
  }
  return 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(detectLocale);
  const meta = locales.find((entry) => entry.code === locale) || locales[0];

  // Set before first paint so numbers and dates render in the right locale
  // on the very first render, not one frame later.
  setFormatLocale(meta.intl);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = meta.dir;
  }, [locale, meta.dir]);

  const setLocale = useCallback((next: LocaleCode) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_KEY, next);
    } catch {
      // A blocked store just means the choice does not outlive the session.
    }
  }, []);

  const t = useCallback<Translate>(
    (key, vars) => {
      // English is the fallback for any string a translation has yet to cover.
      const template = dictionaries[locale][key] ?? en[key] ?? String(key);
      if (!vars) return template;
      return Object.entries(vars).reduce(
        (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
        template,
      );
    },
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, dir: meta.dir, intlTag: meta.intl, t }),
    [locale, setLocale, meta.dir, meta.intl, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}

export function useT(): Translate {
  return useI18n().t;
}

/** Role, customer type, expense category and call purpose all come from the
 *  server as stable English keys; these map them onto translatable strings. */
export const roleKey = (role: string): TranslateKey =>
  role === 'manager' ? 'roleManager' : role === 'supervisor' ? 'roleSupervisor' : 'roleRep';

export const customerTypeKey = (type: string): TranslateKey =>
  (({ pharmacy: 'typePharmacy', doctor: 'typeDoctor', hospital: 'typeHospital', store: 'typeStore' }) as
    Record<string, TranslateKey>)[type] || 'typeStore';

export const expenseCategoryKey = (category: string): TranslateKey =>
  (({ Fuel: 'catFuel', Meal: 'catMeal', Hotel: 'catHotel', Transport: 'catTransport',
      Gift: 'catGift', Other: 'catOther' }) as Record<string, TranslateKey>)[category] || 'catOther';

export const callPurposeKey = (purpose: string): TranslateKey =>
  (({ 'follow-up': 'callFollowUp', order: 'callOrder', complaint: 'callComplaint',
      introduction: 'callIntroduction' }) as Record<string, TranslateKey>)[purpose] || 'callFollowUp';
