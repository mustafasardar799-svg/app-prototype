import { useState } from 'react';
import { useAuth } from '../lib/auth';

const demoAccounts = [
  { username: 'rep', label: 'Rep' },
  { username: 'leader', label: 'Team Leader' },
  { username: 'manager', label: 'Manager' },
];

export default function Login() {
  const { signIn, register } = useAuth();
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
      setError(err instanceof Error ? err.message : 'Could not sign in');
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
      setError(err instanceof Error ? err.message : 'Could not sign in');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="login-card">
        <div className="brand">EliaVit</div>
        <p className="tagline">
          {mode === 'signin' ? 'Sign in to continue' : 'Create your representative account'}
        </p>

        {error && <div className="alert error">{error}</div>}

        <form onSubmit={submit}>
          {mode === 'register' && (
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input id="name" className="control" value={form.name} onChange={set('name')} required />
            </div>
          )}
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username" className="control" autoCapitalize="none" autoComplete="username"
              value={form.username} onChange={set('username')} required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password" type="password" className="control"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={form.password} onChange={set('password')} required
            />
          </div>
          {mode === 'register' && (
            <div className="field">
              <label htmlFor="phone">Phone</label>
              <input id="phone" className="control" inputMode="tel" value={form.phone} onChange={set('phone')} />
            </div>
          )}
          <button className="btn" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Register'}
          </button>
        </form>

        <p className="login-foot">
          {mode === 'signin' ? 'Not a member? ' : 'Already registered? '}
          <a
            href="#"
            onClick={(event) => {
              event.preventDefault();
              setError('');
              setMode(mode === 'signin' ? 'register' : 'signin');
            }}
          >
            {mode === 'signin' ? 'Register now' : 'Sign in'}
          </a>
        </p>

        <div className="demo-users">
          <p>Demo accounts (password demo1234)</p>
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
