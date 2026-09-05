import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { locales, useI18n, useT } from '../lib/i18n';

export default function Login() {
  const { signIn, register } = useAuth();
  const t = useT();
  const { locale, setLocale } = useI18n();
  const demoAccounts = [
    { username: 'rep', label: t('demoRep') },
    { username: 'leader', label: t('demoLeader') },
    { username: 'manager', label: t('demoManager') },
  ];
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [form, setForm] = useState({ username: '', password: '', name: '', phone: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'signin') {
        await signIn(form.username, form.password);
      } else {
        await register({
          username: form.username, password: form.password, name: form.name, phone: form.phone,
        });
      }
    } catch (err) {
      setError(t('couldNotSignIn'));
    } finally {
      setBusy(false);
    }
  }

  async function useDemo(username: string) {
    setBusy(true);
    setError('');
    try {
      await signIn(username, 'demo1234');
    } catch (err) {
      setError(t('couldNotSignIn'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="login-card">
        <div className="brand">{t('appName')}</div>
        <p className="tagline">{mode === 'signin' ? t('signInToContinue') : t('createAccount')}</p>

        {/* Language first: someone who cannot read the form cannot fill it in. */}
        <div className="toggle" style={{ marginBottom: 18 }}>
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

        {error && <div className="alert error">{error}</div>}

        <form onSubmit={submit}>
          {mode === 'register' && (
            <div className="field">
              <label htmlFor="name">{t('fullName')}</label>
              <input id="name" className="control" value={form.name} onChange={set('name')} required />
            </div>
          )}
          <div className="field">
            <label htmlFor="username">{t('username')}</label>
            <input
              id="username" className="control" autoCapitalize="none" autoComplete="username"
              value={form.username} onChange={set('username')} required
            />
          </div>
          <div className="field">
            <label htmlFor="password">{t('password')}</label>
            <input
              id="password" type="password" className="control"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={form.password} onChange={set('password')} required
            />
          </div>
          {mode === 'register' && (
            <div className="field">
              <label htmlFor="phone">{t('phone')}</label>
              <input id="phone" className="control" inputMode="tel" value={form.phone} onChange={set('phone')} />
            </div>
          )}
          <button className="btn" disabled={busy}>
            {busy ? t('pleaseWait') : mode === 'signin' ? t('signIn') : t('register')}
          </button>
        </form>

        <p className="login-foot">
          {mode === 'signin' ? `${t('notAMember')} ` : `${t('alreadyRegistered')} `}
          <a
            href="#"
            onClick={(event) => {
              event.preventDefault();
              setError('');
              setMode(mode === 'signin' ? 'register' : 'signin');
            }}
          >
            {mode === 'signin' ? t('registerNow') : t('signIn')}
          </a>
        </p>

        <div className="demo-users">
          <p>{t('demoAccounts')}</p>
          <div className="demo-row">
            {demoAccounts.map((account) => (
              <button key={account.username} type="button" disabled={busy} onClick={() => useDemo(account.username)}>
                {account.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
