import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import { load, db, update, save } from './db.js';
import { seedIfEmpty } from './seed.js';
import {
  authenticate, hashPassword, verifyPassword, issueToken, publicUser,
} from './auth.js';
import catalogRoutes from './routes/catalog.js';
import recordRoutes from './routes/records.js';
import reportRoutes from './routes/reports.js';

load();
seedIfEmpty();

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = db().users.find(
    (u) => u.username.toLowerCase() === String(username || '').trim().toLowerCase() && !u.deleted,
  );
  if (!user || !verifyPassword(String(password || ''), user.password)) {
    return res.status(401).json({ error: 'Wrong username or password' });
  }
  res.json({ token: issueToken(user), user: publicUser(user) });
});

app.post('/api/auth/register', (req, res) => {
  const { username, password, name, phone } = req.body || {};
  if (!username || !password || !name) {
    return res.status(400).json({ error: 'Name, username and password are required' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  if (db().users.some((u) => u.username.toLowerCase() === String(username).trim().toLowerCase())) {
    return res.status(409).json({ error: 'That username is taken' });
  }
  // New sign-ups join as reps under the manager; a manager reassigns them later.
  const manager = db().users.find((u) => u.role === 'manager');
  const user = {
    id: db().users.reduce((max, u) => Math.max(max, u.id), 0) + 1,
    username: String(username).trim(),
    password: hashPassword(String(password)),
    name: String(name).trim(),
    role: 'rep',
    title: 'Medical Representative',
    phone: phone || '',
    currency: 'IQD',
    supervisorId: manager ? manager.id : null,
    zoneId: null,
  };
  db().users.push(user);
  save();
  res.status(201).json({ token: issueToken(user), user: publicUser(user) });
});

app.use('/api', authenticate);

app.get('/api/me', (req, res) => res.json(publicUser(req.user)));

app.put('/api/me', (req, res) => {
  const { name, phone, currency, avatar } = req.body || {};
  res.json(
    publicUser(
      update('users', req.user.id, {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(phone !== undefined && { phone }),
        ...(currency !== undefined && { currency }),
        ...(avatar !== undefined && { avatar }),
      }),
    ),
  );
});

app.put('/api/me/password', (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!verifyPassword(String(currentPassword || ''), req.user.password)) {
    return res.status(400).json({ error: 'Current password is wrong' });
  }
  if (String(newPassword || '').length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  update('users', req.user.id, { password: hashPassword(String(newPassword)) });
  res.json({ ok: true });
});

app.delete('/api/me', (req, res) => {
  // Soft delete: the rep's history stays intact for the manager's reports.
  update('users', req.user.id, { deleted: true, deletedAt: new Date().toISOString() });
  res.status(204).end();
});

/**
 * Set a staff member's monthly sales target. Managers set anyone's; a team
 * leader only their own reports'.
 */
app.put('/api/users/:id/target', (req, res) => {
  if (req.user.role === 'rep') {
    return res.status(403).json({ error: 'Only managers and team leaders set targets' });
  }
  const target = db().users.find((u) => u.id === Number(req.params.id) && !u.deleted);
  if (!target) return res.status(404).json({ error: 'Staff member not found' });
  if (req.user.role === 'supervisor' && target.supervisorId !== req.user.id) {
    return res.status(403).json({ error: 'That staff member does not report to you' });
  }
  const value = Number(req.body?.target);
  if (!Number.isFinite(value) || value < 0) {
    return res.status(400).json({ error: 'Target must be zero or more' });
  }
  res.json(publicUser(update('users', target.id, { target: Math.round(value) })));
});

app.use('/api', catalogRoutes);
app.use('/api', recordRoutes);
app.use('/api', reportRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: 'Unknown endpoint' }));

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

const clientDist = path.join(process.cwd(), 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
} else {
  app.get('/', (req, res) =>
    res.status(503).send('Client build missing. Run "npm run build" first, or use "npm run dev".'),
  );
}

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`EliaVit sales API listening on :${port}`));
