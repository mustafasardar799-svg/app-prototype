import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, OfflineQueuedError, type Customer, type Visit } from '../lib/api';
import { useAuth } from '../lib/auth';
import { money, shortDate, today } from '../lib/format';
import { callPurposeKey, expenseCategoryKey, useT, type TranslateKey } from '../lib/i18n';
import { Empty, Screen, Skeleton } from '../components/Layout';
import { ConfirmSheet, Sheet } from '../components/Sheet';
import { useToast } from '../components/Toast';
import {
  IconCalendar, IconCheck, IconExpense, IconMoney, IconPhone, IconPin, IconPlus, IconTrash,
} from '../components/Icons';

interface FieldSpec {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'customer' | 'textarea';
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
}

interface Row {
  id: number;
  date: string;
  customerId?: number;
  [key: string]: unknown;
}

interface RecordConfig {
  title: string;
  addTitle: string;
  emptyHeadline: string;
  emptyText: string;
  icon: ReactNode;
  fields: FieldSpec[];
  initial: Record<string, string>;
  list: () => Promise<unknown[]>;
  create: (body: Record<string, unknown>) => Promise<unknown>;
  remove: (id: number) => Promise<void>;
  primary: (row: Row, customerName: (id?: number) => string) => string;
  secondary: (row: Row) => string;
  trailing?: (row: Row, currency?: string) => ReactNode;
  extra?: (row: Row, reload: () => Promise<void>) => ReactNode;
}

/**
 * Expenses, collections, visits and calls are all "one row a rep adds in the
 * field" — same list, same add-sheet, different fields. One component covers
 * all four so their behaviour cannot drift apart.
 */
function RecordScreen({ config }: { config: RecordConfig }) {
  const { user } = useAuth();
  const t = useT();
  const toast = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(config.initial);
  const [confirming, setConfirming] = useState<Row | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    try {
      setRows((await config.list()) as Row[]);
    } catch (err) {
      setError(t('couldNotLoad'));
    }
  };

  useEffect(() => {
    setRows(null);
    setForm(config.initial);
    setAdding(false);
    void reload();
    api.customers().then(setCustomers).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.title]);

  const customerName = useMemo(() => {
    const map = new Map(customers.map((c) => [c.id, c.name]));
    return (id?: number) => (id ? map.get(id) || `Customer #${id}` : '—');
  }, [customers]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await config.create(form);
      setForm(config.initial);
      setAdding(false);
      toast(t('saved'));
      await reload();
    } catch (err) {
      if (err instanceof OfflineQueuedError) {
        // The write is parked on the phone; treat it as a success for the user.
        setForm(config.initial);
        setAdding(false);
        toast(t('savedOnPhone', { label: t(err.labelKey as TranslateKey) }), 'info');
      } else {
        toast(err instanceof Error ? err.message : t('couldNotSave'), 'error');
      }
    } finally {
      setSaving(false);
    }
  }

  async function destroy() {
    if (!confirming) return;
    setSaving(true);
    try {
      await config.remove(confirming.id);
      setConfirming(null);
      toast(t('deleted'));
      await reload();
    } catch (err) {
      toast(t('couldNotDelete'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      title={config.title}
      action={
        <button className="icon-btn" onClick={() => setAdding(true)} aria-label={`Add ${config.title}`}>
          <IconPlus />
        </button>
      }
    >
      {error && <div className="alert error">{error}</div>}

      {!rows && !error && <Skeleton height={68} count={4} />}
      {rows && rows.length === 0 && (
        <div className="card">
          <Empty icon={config.icon} headline={config.emptyHeadline} text={config.emptyText} />
          <button className="btn" onClick={() => setAdding(true)}>
            <IconPlus size={18} /> {config.addTitle}
          </button>
        </div>
      )}

      <div className="list">
        {rows?.map((row) => (
          <div key={row.id} className="card" style={{ padding: 0 }}>
            <div className="row" style={{ boxShadow: 'none', background: 'transparent' }}>
              <span className="grow">
                <span className="title">{config.primary(row, customerName)}</span>
                <span className="sub">
                  {shortDate(row.date)} · {config.secondary(row)}
                </span>
              </span>
              {config.trailing?.(row, user?.currency)}
              <button
                className="icon-btn"
                style={{ color: 'var(--danger)' }}
                onClick={() => setConfirming(row)}
                aria-label={t('deleteRecord')}
              >
                <IconTrash size={18} />
              </button>
            </div>
            {config.extra?.(row, reload)}
          </div>
        ))}
      </div>

      {rows && rows.length > 0 && (
        <button className="btn" style={{ marginTop: 14 }} onClick={() => setAdding(true)}>
          <IconPlus size={18} /> {config.addTitle}
        </button>
      )}

      {adding && (
        <Sheet title={config.addTitle} onClose={() => setAdding(false)}>
          <form onSubmit={save}>
            {config.fields.map((field) => (
              <div className="field" key={field.key}>
                <label htmlFor={field.key}>{field.label}</label>
                {field.type === 'customer' ? (
                  <select
                    id={field.key} className="control" required={field.required}
                    value={form[field.key] || ''}
                    onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
                  >
                    <option value="">{t('selectCustomer')}</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
                ) : field.type === 'select' ? (
                  <select
                    id={field.key} className="control" value={form[field.key] || ''}
                    onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
                  >
                    {(field.options || []).map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    id={field.key} className="control" value={form[field.key] || ''}
                    placeholder={field.placeholder}
                    onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
                  />
                ) : (
                  <input
                    id={field.key} className="control" type={field.type}
                    inputMode={field.type === 'number' ? 'decimal' : undefined}
                    required={field.required} placeholder={field.placeholder}
                    value={form[field.key] || ''}
                    onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
                  />
                )}
              </div>
            ))}
            <div className="sheet-actions">
              <button className="btn ghost" type="button" onClick={() => setAdding(false)}>{t('cancel')}</button>
              <button className="btn" disabled={saving}>{saving ? t('saving') : t('save')}</button>
            </div>
          </form>
        </Sheet>
      )}

      {confirming && (
        <ConfirmSheet
          title={t('deleteRecordQuestion')}
          message={t('deleteRecordQuestionText')}
          onConfirm={destroy}
          onCancel={() => setConfirming(null)}
          busy={saving}
        />
      )}
    </Screen>
  );
}

// Stored in English on the server; translated only for display.
const expenseCategories = ['Fuel', 'Meal', 'Hotel', 'Transport', 'Gift', 'Other'];
const callPurposes = ['follow-up', 'order', 'complaint', 'introduction'];

export function Expenses() {
  const t = useT();
  return (
    <RecordScreen
      config={{
        title: t('expenses'),
        addTitle: t('addExpense'),
        icon: <IconExpense size={26} />,
        emptyHeadline: t('noExpensesYet'),
        emptyText: t('noExpensesYetText'),
        initial: { date: today(), category: 'Fuel', amount: '', note: '' },
        fields: [
          { key: 'date', label: t('date'), type: 'date' },
          {
            key: 'category', label: t('category'), type: 'select',
            options: expenseCategories.map((value) => ({ value, label: t(expenseCategoryKey(value)) })),
          },
          { key: 'amount', label: t('amount'), type: 'number', required: true },
          { key: 'note', label: t('note'), type: 'textarea', placeholder: t('optional') },
        ],
        list: () => api.expenses(),
        create: (body) => api.createExpense(body),
        remove: (id) => api.deleteExpense(id),
        primary: (row) => t(expenseCategoryKey(String(row.category))),
        secondary: (row) => String(row.note || t('noNote')),
        trailing: (row, currency) => <span className="amount">{money(Number(row.amount), currency)}</span>,
      }}
    />
  );
}

export function Collections() {
  const t = useT();
  return (
    <RecordScreen
      config={{
        title: t('moneyCollector'),
        addTitle: t('recordCollection'),
        icon: <IconMoney size={26} />,
        emptyHeadline: t('nothingCollectedYet'),
        emptyText: t('nothingCollectedYetText'),
        initial: { date: today(), customerId: '', amount: '', invoiceNo: '', note: '' },
        fields: [
          { key: 'date', label: t('date'), type: 'date' },
          { key: 'customerId', label: t('customer'), type: 'customer', required: true },
          { key: 'amount', label: t('amountCollected'), type: 'number', required: true },
          { key: 'invoiceNo', label: t('invoiceNo'), type: 'text', placeholder: 'INV-0000' },
          { key: 'note', label: t('note'), type: 'textarea', placeholder: t('optional') },
        ],
        list: () => api.collections(),
        create: (body) => api.createCollection(body),
        remove: (id) => api.deleteCollection(id),
        primary: (row, customerName) => customerName(row.customerId),
        secondary: (row) => String(row.invoiceNo || row.note || t('noInvoice')),
        trailing: (row, currency) => (
          <span className="amount" style={{ color: 'var(--good)' }}>
            {money(Number(row.amount), currency)}
          </span>
        ),
      }}
    />
  );
}

export function Visits() {
  const t = useT();
  return (
    <RecordScreen
      config={{
        title: t('visitPlan'),
        addTitle: t('planAVisit'),
        icon: <IconCalendar size={26} />,
        emptyHeadline: t('noVisitsPlanned'),
        emptyText: t('noVisitsPlannedText'),
        initial: { date: today(), customerId: '', status: 'planned', note: '' },
        fields: [
          { key: 'date', label: t('date'), type: 'date' },
          { key: 'customerId', label: t('customer'), type: 'customer', required: true },
          { key: 'note', label: t('objective'), type: 'textarea', placeholder: t('objectivePlaceholder') },
        ],
        list: () => api.visits(),
        create: (body) => api.createVisit({ ...body, status: 'planned' }),
        remove: (id) => api.deleteVisit(id),
        primary: (row, customerName) => customerName(row.customerId),
        secondary: (row) => String(row.note || t('noObjective')),
        trailing: (row) => <VisitBadge visit={row as unknown as Visit} />,
        extra: (row, reload) => <CheckInBar visit={row as unknown as Visit} onDone={reload} />,
      }}
    />
  );
}

function VisitBadge({ visit }: { visit: Visit }) {
  const t = useT();
  if (visit.status !== 'done') return <span className="pill">{t('planned')}</span>;
  if (visit.verified) return <span className="pill good">{t('onSite')}</span>;
  if (visit.distanceM != null) return <span className="pill warn">{t('offSite')}</span>;
  return <span className="pill">{t('checkedIn')}</span>;
}

/**
 * GPS check-in. The phone's coordinates go with the visit so a team leader can
 * see the rep was actually at the pharmacy, not marking visits from home.
 */
function CheckInBar({ visit, onDone }: { visit: Visit; onDone: () => Promise<void> }) {
  const t = useT();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (visit.status === 'done') {
    if (visit.distanceM == null) {
      return (
        <div style={{ padding: '0 13px 12px', fontSize: 12.5, color: 'var(--ink-soft)' }}>
          {t('checkedInNoLocation')}
        </div>
      );
    }
    return (
      <div
        style={{ padding: '0 13px 12px', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}
        className={visit.verified ? '' : 'muted'}
      >
        <IconPin size={14} />
        {visit.verified
          ? t('confirmedOnSite', { metres: visit.distanceM })
          : t('checkedInFarAway', { km: (visit.distanceM / 1000).toFixed(1) })}
      </div>
    );
  }

  const checkIn = () => {
    setBusy(true);
    const send = (position?: GeolocationPosition) =>
      api
        .checkIn(visit.id, {
          lat: position?.coords.latitude,
          lng: position?.coords.longitude,
          accuracy: position?.coords.accuracy,
        })
        .then(async (saved) => {
          toast(
            saved.verified
              ? t('checkedInMetres', { metres: saved.distanceM ?? 0 })
              : saved.distanceM != null
                ? t('checkedInButFar', { km: (saved.distanceM / 1000).toFixed(1) })
                : t('checkedInNoLocation'),
            saved.verified ? 'ok' : 'info',
          );
          await onDone();
        })
        .catch(() => {
          toast(t('couldNotCheckIn'), 'error');
        })
        .finally(() => setBusy(false));

    if (!navigator.geolocation) {
      void send();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => void send(position),
      // Location refused or unavailable: still record the visit, just unverified.
      () => void send(),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  };

  return (
    <div style={{ padding: '0 13px 12px' }}>
      <button className="btn small ghost" onClick={checkIn} disabled={busy}>
        {busy ? <>{t('locating')}</> : <><IconCheck size={16} /> {t('checkInHere')}</>}
      </button>
    </div>
  );
}

export function Calls() {
  const t = useT();
  return (
    <RecordScreen
      config={{
        title: t('calls'),
        addTitle: t('logACall'),
        icon: <IconPhone size={26} />,
        emptyHeadline: t('noCallsLogged'),
        emptyText: t('noCallsLoggedText'),
        initial: { date: today(), customerId: '', type: 'follow-up', minutes: '', note: '' },
        fields: [
          { key: 'date', label: t('date'), type: 'date' },
          { key: 'customerId', label: t('customer'), type: 'customer', required: true },
          {
            key: 'type', label: t('purpose'), type: 'select',
            options: callPurposes.map((value) => ({ value, label: t(callPurposeKey(value)) })),
          },
          { key: 'minutes', label: t('minutes'), type: 'number' },
          { key: 'note', label: t('note'), type: 'textarea', placeholder: t('optional') },
        ],
        list: () => api.calls(),
        create: (body) => api.createCall(body),
        remove: (id) => api.deleteCall(id),
        primary: (row, customerName) => customerName(row.customerId),
        secondary: (row) =>
          `${t(callPurposeKey(String(row.type)))}${row.note ? ` · ${row.note}` : ''}`,
        trailing: (row) => (
          <span className="pill">{t('minutesShort', { count: Number(row.minutes) || 0 })}</span>
        ),
      }}
    />
  );
}
