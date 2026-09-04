export const money = (amount: number, currency = 'IQD') =>
  `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount)} ${currency}`;

export const shortDate = (iso: string) => {
  if (!iso || iso === '—') return '—';
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

export const monthLabel = (month: string) => {
  const date = new Date(`${month}-01T00:00:00`);
  return Number.isNaN(date.getTime())
    ? month
    : date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

export const today = () => new Date().toISOString().slice(0, 10);

export const daysAgo = (n: number) => {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date.toISOString().slice(0, 10);
};

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';

export const roleLabel = (role: string) =>
  ({ rep: 'Medical Representative', supervisor: 'Team Leader', manager: 'General Sales Manager' })[role] || role;
