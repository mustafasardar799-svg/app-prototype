import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, OfflineQueuedError, type Customer, type Visit } from '../lib/api';
import { useAuth } from '../lib/auth';
import { money, shortDate, today } from '../lib/format';
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
  options?: string[];
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
      setError(err instanceof Error ? err.message : 'Could not load');
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
      toast('Saved');
      await reload();
    } catch (err) {
      if (err instanceof OfflineQueuedError) {
        // The write is parked on the phone; treat it as a success for the user.
        setForm(config.initial);
        setAdding(false);
        toast(err.message, 'info');
      } else {
        toast(err instanceof Error ? err.message : 'Could not save', 'error');
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
      toast('Deleted');
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not delete', 'error');
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
                aria-label="Delete record"
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
                    <option value="">Select customer…</option>
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
                      <option key={option} value={option}>{option}</option>
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
              <button className="btn ghost" type="button" onClick={() => setAdding(false)}>Cancel</button>
              <button className="btn" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </Sheet>
      )}

      {confirming && (
        <ConfirmSheet
          title="Delete record?"
          message="This removes it from your records and from your manager's reports."
          onConfirm={destroy}
          onCancel={() => setConfirming(null)}
          busy={saving}
        />
      )}
    </Screen>
  );
}

const expenseCategories = ['Fuel', 'Meal', 'Hotel', 'Transport', 'Gift', 'Other'];

export function Expenses() {
  return (
    <RecordScreen
      config={{
        title: 'Expenses',
        addTitle: 'Add expense',
        icon: <IconExpense size={26} />,
        emptyHeadline: 'No expenses yet',
        emptyText: 'Log fuel, meals and travel as you spend, so month-end needs no receipts hunt.',
        initial: { date: today(), category: 'Fuel', amount: '', note: '' },
        fields: [
          { key: 'date', label: 'Date', type: 'date' },
          { key: 'category', label: 'Category', type: 'select', options: expenseCategories },
          { key: 'amount', label: 'Amount', type: 'number', required: true },
          { key: 'note', label: 'Note', type: 'textarea', placeholder: 'Optional' },
        ],
        list: () => api.expenses(),
        create: (body) => api.createExpense(body),
        remove: (id) => api.deleteExpense(id),
        primary: (row) => String(row.category),
        secondary: (row) => String(row.note || 'No note'),
        trailing: (row, currency) => <span className="amount">{money(Number(row.amount), currency)}</span>,
      }}
    />
  );
}

export function Collections() {
  return (
    <RecordScreen
      config={{
        title: 'Money Collector',
        addTitle: 'Record collection',
        icon: <IconMoney size={26} />,
        emptyHeadline: 'Nothing collected yet',
        emptyText: 'Record cash and transfers as customers settle their invoices.',
        initial: { date: today(), customerId: '', amount: '', invoiceNo: '', note: '' },
        fields: [
          { key: 'date', label: 'Date', type: 'date' },
          { key: 'customerId', label: 'Customer', type: 'customer', required: true },
          { key: 'amount', label: 'Amount collected', type: 'number', required: true },
          { key: 'invoiceNo', label: 'Invoice no.', type: 'text', placeholder: 'INV-0000' },
          { key: 'note', label: 'Note', type: 'textarea', placeholder: 'Optional' },
        ],
        list: () => api.collections(),
        create: (body) => api.createCollection(body),
        remove: (id) => api.deleteCollection(id),
        primary: (row, customerName) => customerName(row.customerId),
        secondary: (row) => String(row.invoiceNo || row.note || 'No invoice'),
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
  return (
    <RecordScreen
      config={{
        title: 'Visit Plan',
        addTitle: 'Plan a visit',
        icon: <IconCalendar size={26} />,
        emptyHeadline: 'No visits planned',
        emptyText: 'Plan your route, then check in at each customer as you arrive.',
        initial: { date: today(), customerId: '', status: 'planned', note: '' },
        fields: [
          { key: 'date', label: 'Date', type: 'date' },
          { key: 'customerId', label: 'Customer', type: 'customer', required: true },
          { key: 'note', label: 'Objective', type: 'textarea', placeholder: 'What is this visit for?' },
        ],
        list: () => api.visits(),
        create: (body) => api.createVisit({ ...body, status: 'planned' }),
        remove: (id) => api.deleteVisit(id),
        primary: (row, customerName) => customerName(row.customerId),
        secondary: (row) => String(row.note || 'No objective'),
        trailing: (row) => <VisitBadge visit={row as unknown as Visit} />,
        extra: (row, reload) => <CheckInBar visit={row as unknown as Visit} onDone={reload} />,
      }}
    />
  );
}

function VisitBadge({ visit }: { visit: Visit }) {
  if (visit.status !== 'done') return <span className="pill">planned</span>;
  if (visit.verified) return <span className="pill good">on site</span>;
  if (visit.distanceM != null) return <span className="pill warn">off site</span>;
  return <span className="pill">checked in</span>;
}

/**
 * GPS check-in. The phone's coordinates go with the visit so a team leader can
 * see the rep was actually at the pharmacy, not marking visits from home.
 */
function CheckInBar({ visit, onDone }: { visit: Visit; onDone: () => Promise<void> }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (visit.status === 'done') {
    if (visit.distanceM == null) {
      return (
        <div style={{ padding: '0 13px 12px', fontSize: 12.5, color: 'var(--ink-soft)' }}>
          Checked in without location.
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
          ? `Confirmed on site — ${visit.distanceM} m from the customer`
          : `Checked in ${(visit.distanceM / 1000).toFixed(1)} km from the customer's address`}
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
              ? `Checked in — ${saved.distanceM} m from the customer`
              : saved.distanceM != null
                ? `Checked in, but ${(saved.distanceM / 1000).toFixed(1)} km away`
                : 'Checked in without location',
            saved.verified ? 'ok' : 'info',
          );
          await onDone();
        })
        .catch((err) => {
          toast(err instanceof Error ? err.message : 'Could not check in', 'error');
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
        {busy ? <>Locating…</> : <><IconCheck size={16} /> Check in here</>}
      </button>
    </div>
  );
}

export function Calls() {
  return (
    <RecordScreen
      config={{
        title: 'Calls',
        addTitle: 'Log a call',
        icon: <IconPhone size={26} />,
        emptyHeadline: 'No calls logged',
        emptyText: 'Record follow-up calls so nothing slips between visits.',
        initial: { date: today(), customerId: '', type: 'follow-up', minutes: '', note: '' },
        fields: [
          { key: 'date', label: 'Date', type: 'date' },
          { key: 'customerId', label: 'Customer', type: 'customer', required: true },
          { key: 'type', label: 'Purpose', type: 'select', options: ['follow-up', 'order', 'complaint', 'introduction'] },
          { key: 'minutes', label: 'Minutes', type: 'number' },
          { key: 'note', label: 'Note', type: 'textarea', placeholder: 'Optional' },
        ],
        list: () => api.calls(),
        create: (body) => api.createCall(body),
        remove: (id) => api.deleteCall(id),
        primary: (row, customerName) => customerName(row.customerId),
        secondary: (row) => `${row.type}${row.note ? ` · ${row.note}` : ''}`,
        trailing: (row) => <span className="pill">{Number(row.minutes) || 0} min</span>,
      }}
    />
  );
}
