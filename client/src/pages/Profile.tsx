import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { initials } from '../lib/format';
import { locales, roleKey, useI18n, useT } from '../lib/i18n';
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
  const { locale, setLocale } = useI18n();
  const t = useT();
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
      toast(t('profileUpdated'));
    } catch (err) {
      setMessage({ kind: 'error', text: t('couldNotUpdate') });
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
      toast(t('passwordChanged'));
    } catch (err) {
      setMessage({ kind: 'error', text: t('couldNotChangePassword') });
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
      setMessage({ kind: 'error', text: t('couldNotDeleteAccount') });
      setBusy(false);
    }
  }

  const dismissDelete = () => {
    setConfirmingDelete(false);
    if (params.get('delete')) setParams({});
  };

  return (
    <Screen
      title={t('profile')}
      action={
        <button className="icon-btn" onClick={() => setEditing(!editing)} aria-label={t('editProfile')}>
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
        <div style={{ opacity: 0.85, fontSize: 13.5 }}>{t(roleKey(user?.role || ''))}</div>
      </div>

      {message && <div className={`alert ${message.kind}`}>{message.text}</div>}

      {editing ? (
        <form className="card" onSubmit={saveProfile}>
          <div className="field">
            <label htmlFor="name">{t('name')}</label>
            <input
              id="name" className="control" value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })} required
            />
          </div>
          <div className="field">
            <label htmlFor="phone">{t('phone')}</label>
            <input
              id="phone" className="control" inputMode="tel" value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="currency">{t('currency')}</label>
            <select
              id="currency" className="control" value={form.currency}
              onChange={(event) => setForm({ ...form, currency: event.target.value })}
            >
              {['IQD', 'USD', 'EUR', 'AED'].map((code) => <option key={code} value={code}>{code}</option>)}
            </select>
          </div>
          <div className="sheet-actions">
            <button className="btn ghost" type="button" onClick={() => setEditing(false)}>{t('cancel')}</button>
            <button className="btn" disabled={busy}>{t('saveChanges')}</button>
          </div>
        </form>
      ) : (
        <div className="list">
          <InfoRow label={t('name')} value={user?.name || '—'} />
          <InfoRow label={t('role')} value={t(roleKey(user?.role || ''))} />
          <InfoRow label={t('phone')} value={user?.phone || '—'} />
          <InfoRow label={t('userName')} value={user?.username || '—'} />
          <InfoRow label={t('currency')} value={user?.currency || 'IQD'} />
          {user?.target ? (
            <div className="row" style={{ display: 'block' }}>
              <div className="muted" style={{ fontSize: 12.5 }}>
                <IconTarget size={13} /> {t('monthlyTarget')}
              </div>
              <div style={{ fontWeight: 600, marginTop: 2 }}>{money(user.target, user.currency)}</div>
            </div>
          ) : null}
        </div>
      )}

      <div className="section-title">{t('language')}</div>
      <div className="card">
        <div className="toggle">
          {locales.map((entry) => (
            <button
              key={entry.code}
              type="button"
              lang={entry.code}
              className={locale === entry.code ? 'on' : ''}
              onClick={() => setLocale(entry.code)}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 12.5, margin: '10px 0 0' }}>
          {locales.find((entry) => entry.code === locale)?.english}
        </p>
      </div>

      <div className="section-title">{t('appearance')}</div>
      <div className="card">
        <div className="toggle">
          {([
            { key: 'system', label: t('appearanceSystem') },
            { key: 'light', label: t('appearanceLight') },
            { key: 'dark', label: t('appearanceDark') },
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
          {t('systemFollowsPhone')}
        </p>
      </div>

      <div className="section-title">{t('sync')}</div>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <IconInbox size={19} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>
              {queue.length === 0
                ? t('everythingSynced')
                : queue.length === 1
                  ? t('recordsWaiting', { count: queue.length })
                  : t('recordsWaitingPlural', { count: queue.length })}
            </div>
            <div className="muted" style={{ fontSize: 12.5 }}>
              {online ? t('connected') : t('noConnectionSaved')}
            </div>
          </div>
          {queue.length > 0 && online && (
            <button className="btn small ghost" onClick={() => void sync()}>{t('syncNow')}</button>
          )}
        </div>
        {queue.length > 0 && (
          <ul className="muted" style={{ fontSize: 12.5, margin: '10px 0 0', paddingLeft: 18 }}>
            {queue.slice(0, 5).map((entry) => (
              <li key={entry.id}>{t(entry.label as Parameters<typeof t>[0])}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="section-title">{t('changePassword')}</div>
      <form className="card" onSubmit={changePassword}>
        <div className="field">
          <label htmlFor="current">{t('currentPassword')}</label>
          <input
            id="current" type="password" className="control" autoComplete="current-password"
            value={passwords.currentPassword}
            onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="next">{t('newPassword')}</label>
          <input
            id="next" type="password" className="control" autoComplete="new-password" minLength={6}
            value={passwords.newPassword}
            onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })}
            required
          />
        </div>
        <button className="btn ghost" disabled={busy}>{t('updatePassword')}</button>
      </form>

      <div className="section-title">{t('account')}</div>
      <button className="btn danger" onClick={() => setConfirmingDelete(true)}>
        <IconTrash size={18} /> {t('deleteAccount')}
      </button>

      {confirmingDelete && (
        <ConfirmSheet
          title={t('deleteYourAccount')}
          message={t('deleteAccountText')}
          confirmLabel={t('deleteAccount')}
          onConfirm={deleteAccount}
          onCancel={dismissDelete}
          busy={busy}
        />
      )}

      <button className="btn ghost" style={{ marginTop: 10 }} onClick={signOut}>
        <IconLogout size={18} /> {t('logout')}
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
