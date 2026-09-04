import crypto from 'node:crypto';
import { db } from './db.js';

const SECRET = process.env.SESSION_SECRET || 'eliavit-dev-secret-change-me';
const TOKEN_TTL_MS = 1000 * 60 * 60 * 12;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password, stored) {
  const [salt, expected] = String(stored).split(':');
  if (!salt || !expected) return false;
  const derived = crypto.scryptSync(password, salt, 32);
  const expectedBuf = Buffer.from(expected, 'hex');
  return expectedBuf.length === derived.length && crypto.timingSafeEqual(derived, expectedBuf);
}

function sign(payload) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}

export function issueToken(user) {
  const body = Buffer.from(
    JSON.stringify({ id: user.id, role: user.role, exp: Date.now() + TOKEN_TTL_MS }),
  ).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function readToken(token) {
  const [body, signature] = String(token || '').split('.');
  if (!body || !signature) return null;
  const expected = sign(body);
  if (
    expected.length !== signature.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  ) {
    return null;
  }
  try {
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!claims.exp || claims.exp < Date.now()) return null;
    return claims;
  } catch {
    return null;
  }
}

export function authenticate(req, res, next) {
  const header = req.get('authorization') || '';
  const claims = readToken(header.replace(/^Bearer\s+/i, ''));
  const user = claims && db().users.find((u) => u.id === claims.id && !u.deleted);
  if (!user) return res.status(401).json({ error: 'Not signed in' });
  req.user = user;
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Your role cannot perform this action' });
    }
    next();
  };
}

/**
 * Ids whose records `user` may read. A rep sees their own work, a supervisor
 * sees their team's, a manager sees everyone's.
 */
export function visibleUserIds(user) {
  const users = db().users;
  if (user.role === 'manager') return users.map((u) => u.id);
  if (user.role === 'supervisor') {
    return [user.id, ...users.filter((u) => u.supervisorId === user.id).map((u) => u.id)];
  }
  return [user.id];
}

export function publicUser(user) {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
}
