import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { initials, roleLabel } from '../lib/format';
import { Screen } from '../components/Layout';
import { ConfirmSheet } from '../components/Sheet';
import { useToast } from '../components/Toast';
import { useTheme, type ThemeChoice } from '../lib/theme';
import { useConnection } from '../lib/connection';
import { money } from '../lib/format';
import { IconCheck, IconEdit, IconInbox, IconLogout, IconMoon, IconSun, IconTarget, IconTrash } from '../components/Icons';

export default function Profile() {
  const { user, refresh, signOut } = useAuth();
  const toast = useToast();
  const { choice, setChoice } = useTheme();
  const { online, queue, sync } = useConnection();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', currency: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(params.get('delete') === '1');

  useEffect(() => {
    if (user) setForm({ name: user.name, phone: user.phone || '', currency: user.currency || 'IQD' });
  }, [user]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api.updateMe(form);
      await refresh();
      setEditing(false);
      toast('Profile updated');
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Could not update' });
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api.changePassword(passwords);
      setPasswords({ currentPassword: '', newPassword: '' });
      toast('Password changed');
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Could not change password' });
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    setBusy(true);
    try {
      await api.deleteMe();
      signOut();
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Could not delete the account' });
      setBusy(false);
    }
  }

  const dismissDelete = () => {
    setConfirmingDelete(false);
    if (params.get('delete')) setParams({});
  };

  return (
    <Screen
      title="Profile"
      action={
        <button className="icon-btn" onClick={() => setEditing(!editing)} aria-label="Edit profile">
          {editing ? <IconCheck /> : <IconEdit />}
        </button>
      }
    >
      <div
        style={{
          background: 'var(--brand)', margin: '-14px -14px 14px', padding: '22px 14px 26px',
          textAlign: 'center', color: '#fff',
        }}
      >
        <div
          className="avatar"
          style={{ width: 86, height: 86, margin: '0 auto', fontSize: 30, background: 'rgba(255,255,255,0.22)', color: '#fff' }}
        >
          {initials(user?.name || '')}
        </div>
        <div style={{ marginTop: 12, fontWeight: 700, fontSize: 19 }}>{user?.name}</div>
        <div style={{ opacity: 0.85, fontSize: 13.5 }}>{roleLabel(user?.role || '')}</div>
      </div>

      {message && <div className={`alert ${message.kind}`}>{message.text}</div>}

      {editing ? (
        <form className="card" onSubmit={saveProfile}>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input
              id="name" className="control" value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })} required
            />
          </div>
          <div className="field">
            <label htmlFor="phone">Phone</label>
            <input
              id="phone" className="control" inputMode="tel" value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="currency">Currency</label>
            <select
              id="currency" className="control" value={form.currency}
              onChange={(event) => setForm({ ...form, currency: event.target.value })}
            >
              {['IQD', 'USD', 'EUR', 'AED'].map((code) => <option key={code} value={code}>{code}</option>)}
            </select>
          </div>
          <div className="sheet-actions">
            <button className="btn ghost" type="button" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn" disabled={busy}>Save changes</button>
          </div>
        </form>
      ) : (
        <div className="list">
          <InfoRow label="Name" value={user?.name || '—'} />
          <InfoRow label="Role" value={roleLabel(user?.role || '')} />
          <InfoRow label="Phone" value={user?.phone || '—'} />
          <InfoRow label="User Name" value={user?.username || '—'} />
          <InfoRow label="Currency" value={user?.currency || 'IQD'} />
          {user?.target ? (
            <div className="row" style={{ display: 'block' }}>
              <div className="muted" style={{ fontSize: 12.5 }}>
                <IconTarget size={13} /> Monthly target
              </div>
              <div style={{ fontWeight: 600, marginTop: 2 }}>{money(user.target, user.currency)}</div>
            </div>
          ) : null}
        </div>
      )}

      <div className="section-title">Appearance</div>
      <div className="card">
        <div className="toggle">
          {([
            { key: 'system', label: 'System' },
            { key: 'light', label: 'Light' },
            { key: 'dark', label: 'Dark' },
          ] as { key: ThemeChoice; label: string }[]).map((option) => (
            <button
              key={option.key}
              type="button"
              className={choice === option.key ? 'on' : ''}
              onClick={() => setChoice(option.key)}
            >
              {option.key === 'dark' ? <IconMoon size={15} /> : option.key === 'light' ? <IconSun size={15} /> : null}
              {option.label}
            </button>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 12.5, margin: '10px 0 0' }}>
          System follows your iPhone's Display setting.
        </p>
      </div>

      <div className="section-title">Sync</div>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <IconInbox size={19} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>
              {queue.length === 0
                ? 'Everything is synced'
                : `${queue.length} record${queue.length === 1 ? '' : 's'} waiting`}
            </div>
            <div className="muted" style={{ fontSize: 12.5 }}>
              {online ? 'Connected' : 'No connection — work is saved on this phone'}
            </div>
          </div>
          {queue.length > 0 && online && (
            <button className="btn small ghost" onClick={() => void sync()}>Sync now</button>
          )}
        </div>
        {queue.length > 0 && (
          <ul className="muted" style={{ fontSize: 12.5, margin: '10px 0 0', paddingLeft: 18 }}>
            {queue.slice(0, 5).map((entry) => (
              <li key={entry.id}>{entry.label}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="section-title">Change password</div>
      <form className="card" onSubmit={changePassword}>
        <div className="field">
          <label htmlFor="current">Current password</label>
          <input
            id="current" type="password" className="control" autoComplete="current-password"
            value={passwords.currentPassword}
            onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="next">New password</label>
          <input
            id="next" type="password" className="control" autoComplete="new-password" minLength={6}
            value={passwords.newPassword}
            onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })}
            required
          />
        </div>
        <button className="btn ghost" disabled={busy}>Update password</button>
      </form>

      <div className="section-title">Account</div>
      <button className="btn danger" onClick={() => setConfirmingDelete(true)}>
        <IconTrash size={18} /> Delete Account
      </button>

      {confirmingDelete && (
        <ConfirmSheet
          title="Delete your account?"
          message="You will be signed out and your account hidden from the app. The sales you recorded stay in the company reports."
          confirmLabel="Delete account"
          onConfirm={deleteAccount}
          onCancel={dismissDelete}
          busy={busy}
        />
      )}

      <button className="btn ghost" style={{ marginTop: 10 }} onClick={signOut}>
        <IconLogout size={18} /> Logout
      </button>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="row" style={{ display: 'block' }}>
      <div className="muted" style={{ fontSize: 12.5 }}>{label}</div>
      <div style={{ fontWeight: 600, marginTop: 2 }}>{value}</div>
    </div>
  );
}
