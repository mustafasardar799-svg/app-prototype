import { useEffect, useState } from 'react';
import { api, type Customer, type Zone } from '../lib/api';
import { initials } from '../lib/format';
import { Empty, Screen, Spinner } from '../components/Layout';
import { IconPlus, IconSearch, IconTrash } from '../components/Icons';

const types = ['pharmacy', 'doctor', 'hospital', 'store'];

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'pharmacy', zoneId: '', phone: '', address: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const reload = () =>
    api.customers().then(setCustomers).catch((err) => setError(err.message));

  useEffect(() => {
    reload();
    api.zones().then(setZones).catch(() => undefined);
  }, []);

  const visible = (customers || []).filter(
    (customer) =>
      (typeFilter === 'all' || customer.type === typeFilter) &&
      customer.name.toLowerCase().includes(search.toLowerCase()),
  );

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createCustomer({
        ...form,
        zoneId: form.zoneId ? Number(form.zoneId) : null,
      });
      setForm({ name: '', type: 'pharmacy', zoneId: '', phone: '', address: '' });
      setAdding(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the customer');
    } finally {
      setSaving(false);
    }
  }

  async function destroy(customer: Customer) {
    if (!confirm(`Remove ${customer.name}?`)) return;
    try {
      await api.deleteCustomer(customer.id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove');
    }
  }

  return (
    <Screen
      title="Customers"
      action={
        <button className="icon-btn" onClick={() => setAdding(!adding)} aria-label="Add customer">
          <IconPlus />
        </button>
      }
    >
      {error && <div className="alert error">{error}</div>}

      {adding && (
        <form className="card" onSubmit={save} style={{ marginBottom: 14 }}>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input
              id="name" className="control" required value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="type">Type</label>
              <select
                id="type" className="control" value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value })}
              >
                {types.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="zone">Zone</label>
              <select
                id="zone" className="control" value={form.zoneId}
                onChange={(event) => setForm({ ...form, zoneId: event.target.value })}
              >
                <option value="">—</option>
                {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="phone">Phone</label>
            <input
              id="phone" className="control" inputMode="tel" value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="address">Address</label>
            <input
              id="address" className="control" value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
            />
          </div>
          <div className="sheet-actions">
            <button className="btn ghost" type="button" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn" disabled={saving}>{saving ? 'Saving…' : 'Save customer'}</button>
          </div>
        </form>
      )}

      <div className="field" style={{ position: 'relative' }}>
        <input
          className="control" placeholder="Search customers" value={search}
          onChange={(event) => setSearch(event.target.value)} style={{ paddingLeft: 40 }}
        />
        <span style={{ position: 'absolute', left: 12, top: 12, color: 'var(--ink-soft)' }}>
          <IconSearch size={19} />
        </span>
      </div>

      <div className="toggle" style={{ marginBottom: 14 }}>
        {['all', ...types].map((type) => (
          <button key={type} className={typeFilter === type ? 'on' : ''} onClick={() => setTypeFilter(type)}>
            {type === 'all' ? 'All' : type}
          </button>
        ))}
      </div>

      {!customers && !error && <Spinner />}
      {customers && visible.length === 0 && <Empty text="No customers match." />}

      <div className="list">
        {visible.map((customer) => (
          <div key={customer.id} className="row">
            <span className="avatar">{initials(customer.name)}</span>
            <span className="grow">
              <span className="title">{customer.name}</span>
              <span className="sub">
                {customer.type}
                {customer.phone ? ` · ${customer.phone}` : ''}
                {customer.address ? ` · ${customer.address}` : ''}
              </span>
            </span>
            <button
              className="icon-btn" style={{ color: 'var(--danger)' }}
              onClick={() => destroy(customer)} aria-label={`Remove ${customer.name}`}
            >
              <IconTrash size={18} />
            </button>
          </div>
        ))}
      </div>
    </Screen>
  );
}
