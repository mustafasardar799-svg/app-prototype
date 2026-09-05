import { useEffect, useState } from 'react';
import { api, type Customer, type Zone } from '../lib/api';
import { initials } from '../lib/format';
import { Empty, Screen, Skeleton } from '../components/Layout';
import { ConfirmSheet, Sheet } from '../components/Sheet';
import { useToast } from '../components/Toast';
import { OfflineQueuedError } from '../lib/api';
import { IconPin, IconPlus, IconSearch, IconTrash, IconUsers } from '../components/Icons';

const types = ['pharmacy', 'doctor', 'hospital', 'store'];

export default function Customers() {
  const toast = useToast();
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'pharmacy', zoneId: '', phone: '', address: '' });
  const [pinned, setPinned] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [confirming, setConfirming] = useState<Customer | null>(null);
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

  const resetForm = () => {
    setForm({ name: '', type: 'pharmacy', zoneId: '', phone: '', address: '' });
    setPinned(null);
  };

  /** Pin the customer where the rep is standing, so visit check-ins can verify. */
  function pinHere() {
    if (!navigator.geolocation) {
      toast('This device cannot share a location', 'error');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPinned({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocating(false);
        toast('Location pinned');
      },
      () => {
        setLocating(false);
        toast('Could not get your location', 'error');
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.createCustomer({
        ...form,
        zoneId: form.zoneId ? Number(form.zoneId) : null,
        ...(pinned || {}),
      });
      resetForm();
      setAdding(false);
      toast('Customer added');
      await reload();
    } catch (err) {
      if (err instanceof OfflineQueuedError) {
        resetForm();
        setAdding(false);
        toast(err.message, 'info');
      } else {
        toast(err instanceof Error ? err.message : 'Could not save the customer', 'error');
      }
    } finally {
      setSaving(false);
    }
  }

  async function destroy() {
    if (!confirming) return;
    setSaving(true);
    try {
      await api.deleteCustomer(confirming.id);
      setConfirming(null);
      toast('Customer removed');
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not remove', 'error');
    } finally {
      setSaving(false);
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
        <Sheet title="Add customer" onClose={() => setAdding(false)}>
          <form onSubmit={save}>
            <div className="field">
              <label htmlFor="name">Name</label>
              <input
                id="name" className="control" required value={form.name} autoFocus
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

            <div className="field">
              <label>Location</label>
              <button type="button" className="btn ghost" onClick={pinHere} disabled={locating}>
                <IconPin size={17} />
                {locating ? 'Getting your location…' : pinned ? 'Location pinned — tap to redo' : 'Pin at my current location'}
              </button>
              <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>
                {pinned
                  ? `Saved at ${pinned.lat.toFixed(4)}, ${pinned.lng.toFixed(4)}.`
                  : 'Pin the shop while you are standing in it — visit check-ins are then verified against it.'}
              </p>
            </div>

            <div className="sheet-actions">
              <button className="btn ghost" type="button" onClick={() => setAdding(false)}>Cancel</button>
              <button className="btn" disabled={saving}>{saving ? 'Saving…' : 'Save customer'}</button>
            </div>
          </form>
        </Sheet>
      )}

      {confirming && (
        <ConfirmSheet
          title={`Remove ${confirming.name}?`}
          message="Their past orders stay in the reports; only the customer record is removed."
          confirmLabel="Remove"
          onConfirm={destroy}
          onCancel={() => setConfirming(null)}
          busy={saving}
        />
      )}

      <div className="search-wrap">
        <span className="icon"><IconSearch size={19} /></span>
        <input
          className="control" placeholder="Search customers" value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="toggle" style={{ marginBottom: 14 }}>
        {['all', ...types].map((type) => (
          <button key={type} className={typeFilter === type ? 'on' : ''} onClick={() => setTypeFilter(type)}>
            {type === 'all' ? 'All' : type}
          </button>
        ))}
      </div>

      {!customers && !error && <Skeleton height={68} count={5} />}
      {customers && visible.length === 0 && (
        <Empty
          icon={<IconUsers size={26} />}
          headline={search || typeFilter !== 'all' ? 'No matches' : 'No customers yet'}
          text={
            search || typeFilter !== 'all'
              ? 'Try a different search or filter.'
              : 'Add the pharmacies, clinics and hospitals on your route.'
          }
        />
      )}

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
                {customer.lat != null && customer.lng != null ? ' · 📍 pinned' : ''}
              </span>
            </span>
            <button
              className="icon-btn" style={{ color: 'var(--danger)' }}
              onClick={() => setConfirming(customer)} aria-label={`Remove ${customer.name}`}
            >
              <IconTrash size={18} />
            </button>
          </div>
        ))}
      </div>
    </Screen>
  );
}
