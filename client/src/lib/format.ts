/**
 * Locale-aware formatting.
 *
 * The active tag is set once by the i18n provider rather than threaded through
 * every call site; a locale change re-renders the tree, so values pick it up.
 *
 * Digits stay Latin in every language. Arabic and Sorani would otherwise render
 * Arabic-Indic numerals by default, and a sales app whose figures change shape
 * between the screen, the CSV and Excel is a reliable source of costly mistakes.
 */
let activeTag = 'en-GB';

export function setFormatLocale(tag: string) {
  activeTag = tag;
}

const LATIN = { numberingSystem: 'latn' } as const;

export const number = (value: number, maximumFractionDigits = 2) =>
  new Intl.NumberFormat(activeTag, { ...LATIN, maximumFractionDigits }).format(value);

export const money = (amount: number, currency = 'IQD') =>
  `${new Intl.NumberFormat(activeTag, {
    ...LATIN,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)} ${currency}`;

export const shortDate = (iso: string) => {
  if (!iso || iso === '—') return '—';
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? iso
    : new Intl.DateTimeFormat(activeTag, { ...LATIN, day: '2-digit', month: 'short' }).format(date);
};

export const monthLabel = (month: string) => {
  const date = new Date(`${month}-01T00:00:00`);
  return Number.isNaN(date.getTime())
    ? month
    : new Intl.DateTimeFormat(activeTag, { ...LATIN, month: 'short', year: 'numeric' }).format(date);
};

/** Just the month name, for chart axes where the year is implied. */
export const monthShort = (month: string) => {
  const date = new Date(`${month}-01T00:00:00`);
  return Number.isNaN(date.getTime())
    ? month
    : new Intl.DateTimeFormat(activeTag, { ...LATIN, month: 'short' }).format(date);
};

export const today = () => new Date().toISOString().slice(0, 10);

export const daysAgo = (n: number) => {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date.toISOString().slice(0, 10);
};

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';
