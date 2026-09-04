import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, type Customer } from '../lib/api';
import { useAuth } from '../lib/auth';
import { money, shortDate, today } from '../lib/format';
import { Empty, Screen, Spinner } from '../components/Layout';
import { IconPlus, IconTrash } from '../components/Icons';

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
  emptyText: string;
  fields: FieldSpec[];
  initial: Record<string, string>;
  list: () => Promise<unknown[]>;
  create: (body: Record<string, unknown>) => Promise<unknown>;
  remove: (id: number) => Promise<void>;
  primary: (row: Row, customerName: (id?: number) => string) => string;
  secondary: (row: Row) => string;
  trailing?: (row: Row, currency?: string) => ReactNode;
}

/**
 * Expenses, collections, visits and calls are all "one row a rep adds in the
 * field" — same list, same add-sheet, different fields. One component covers
 * all four so their behaviour cannot drift apart.
 */
function RecordScreen({ config }: { config: RecordConfig }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(config.initial);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const reload = () =>
    config.list()
      .then((loaded) => setRows(loaded as Row[]))
      .catch((err) => setError(err.message));

  useEffect(() => {
    setRows(null);
    setForm(config.initial);
    setAdding(false);
    reload();
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
    setError('');
    try {
      await config.create(form);
      setForm(config.initial);
      setAdding(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  async function destroy(row: Row) {
    if (!confirm('Delete this record?')) return;
    try {
      await config.remove(row.id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete');
    }
  }

  return (
    <Screen
      title={config.title}
      action={
        <button className="icon-btn" onClick={() => setAdding(!adding)} aria-label={`Add ${config.title}`}>
          <IconPlus />
        </button>
      }
    >
      {error && <div className="alert error">{error}</div>}

      {adding && (
        <form className="card" onSubmit={save} style={{ marginBottom: 14 }}>
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
      )}

      {!rows && !error && <Spinner />}
      {rows && rows.length === 0 && <Empty text={config.emptyText} />}

      <div className="list">
        {rows?.map((row) => (
          <div key={row.id} className="row">
            <span className="grow">
              <span className="title">{config.primary(row, customerName)}</span>
              <span className="sub">
                {shortDate(row.date)} · {config.secondary(row)}
              </span>
            </span>
            {config.trailing?.(row, user?.currency)}
            <button
              className="icon-btn" style={{ color: 'var(--danger)' }}
              onClick={() => destroy(row)} aria-label="Delete record"
            >
              <IconTrash size={18} />
            </button>
          </div>
        ))}
      </div>
    </Screen>
  );
}

const expenseCategories = ['Fuel', 'Meal', 'Hotel', 'Transport', 'Gift', 'Other'];

export function Expenses() {
  return (
    <RecordScreen
      config={{
        title: 'Expenses',
        emptyText: 'No expenses recorded yet.',
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
        emptyText: 'No collections recorded yet.',
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
          <span className="amount" style={{ color: 'var(--success)' }}>
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
        emptyText: 'No visits planned yet.',
        initial: { date: today(), customerId: '', status: 'planned', note: '' },
        fields: [
          { key: 'date', label: 'Date', type: 'date' },
          { key: 'customerId', label: 'Customer', type: 'customer', required: true },
          { key: 'status', label: 'Status', type: 'select', options: ['planned', 'done'] },
          { key: 'note', label: 'Objective', type: 'textarea', placeholder: 'What is this visit for?' },
        ],
        list: () => api.visits(),
        create: (body) => api.createVisit(body),
        remove: (id) => api.deleteVisit(id),
        primary: (row, customerName) => customerName(row.customerId),
        secondary: (row) => String(row.note || 'No objective'),
        trailing: (row) => <span className={`pill ${row.status === 'done' ? 'done' : 'pending'}`}>{String(row.status)}</span>,
      }}
    />
  );
}

export function Calls() {
  return (
    <RecordScreen
      config={{
        title: 'Calls',
        emptyText: 'No calls logged yet.',
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
