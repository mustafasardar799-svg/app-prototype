import express from 'express';
import { db, insert, update, remove, nextId } from '../db.js';
import { visibleUserIds } from '../auth.js';

const router = express.Router();

const today = () => new Date().toISOString().slice(0, 10);

/** Metres between two coordinates (haversine). */
function distanceBetween(a, b) {
  if (!a || !b || a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(earthRadius * 2 * Math.asin(Math.sqrt(h)));
}

/** A signature is a small data: URL drawn on the phone. Cap it so the store stays sane. */
const MAX_SIGNATURE_BYTES = 64 * 1024;

function cleanSignature(value) {
  if (typeof value !== 'string' || value === '') return '';
  if (!value.startsWith('data:image/png;base64,')) return '';
  return value.length > MAX_SIGNATURE_BYTES ? '' : value;
}

function scope(req, rows) {
  const allowed = new Set(visibleUserIds(req.user));
  let out = rows.filter((r) => allowed.has(r.userId));
  const { userId, from, to } = req.query;
  if (userId && userId !== 'all') out = out.filter((r) => r.userId === Number(userId));
  if (from) out = out.filter((r) => r.date >= from);
  if (to) out = out.filter((r) => r.date <= to);
  return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));
}

function canEdit(req, row) {
  if (!row) return false;
  return row.userId === req.user.id || req.user.role !== 'rep';
}

/* ---------------------------------- orders --------------------------------- */

function lineTotal(line) {
  return line.qty * line.price * (1 - (line.discount || 0) / 100);
}

function normaliseLines(lines) {
  const products = db().products;
  return (Array.isArray(lines) ? lines : [])
    .map((line) => {
      const product = products.find((p) => p.id === Number(line.productId));
      if (!product) return null;
      return {
        productId: product.id,
        qty: Math.max(1, Number(line.qty) || 0),
        bonus: Math.max(0, Number(line.bonus) || 0),
        price: line.price !== undefined && line.price !== '' ? Number(line.price) : product.price,
        discount: Math.min(100, Math.max(0, Number(line.discount) || 0)),
      };
    })
    .filter(Boolean);
}

router.get('/orders', (req, res) => {
  const { type, customerId, status } = req.query;
  let rows = scope(req, db().orders);
  if (type && type !== 'both') rows = rows.filter((o) => o.type === type);
  if (status && status !== 'all') rows = rows.filter((o) => o.status === status);
  if (customerId && customerId !== 'all') rows = rows.filter((o) => o.customerId === Number(customerId));
  res.json(rows);
});

router.get('/orders/:id', (req, res) => {
  const allowed = new Set(visibleUserIds(req.user));
  const order = db().orders.find((o) => o.id === Number(req.params.id));
  if (!order || !allowed.has(order.userId)) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

router.post('/orders', (req, res) => {
  const { customerId, type = 'order', date, note, lines, status, signature, signedBy } = req.body || {};
  const customer = db().customers.find((c) => c.id === Number(customerId));
  if (!customer) return res.status(400).json({ error: 'Choose a customer' });
  const normalised = normaliseLines(lines);
  if (normalised.length === 0) return res.status(400).json({ error: 'Add at least one product' });

  const id = nextId('orders');
  const record = insert('orders', {
    code: `${type === 'return' ? 'RET' : 'ORD'}-${String(id).padStart(4, '0')}`,
    userId: req.user.id,
    customerId: customer.id,
    type: type === 'return' ? 'return' : 'order',
    date: date || today(),
    lines: normalised,
    total: Number(normalised.reduce((sum, l) => sum + lineTotal(l), 0).toFixed(2)),
    status: status === 'pending' ? 'pending' : 'confirmed',
    note: note || '',
    signature: cleanSignature(signature),
    signedBy: signature ? String(signedBy || '').slice(0, 80) : '',
  });
  res.status(201).json(record);
});

router.put('/orders/:id', (req, res) => {
  const order = db().orders.find((o) => o.id === Number(req.params.id));
  if (!canEdit(req, order)) return res.status(404).json({ error: 'Order not found' });
  const patch = {};
  if (req.body.lines) {
    patch.lines = normaliseLines(req.body.lines);
    patch.total = Number(patch.lines.reduce((sum, l) => sum + lineTotal(l), 0).toFixed(2));
  }
  for (const key of ['date', 'note', 'status', 'customerId']) {
    if (req.body[key] !== undefined) patch[key] = key === 'customerId' ? Number(req.body[key]) : req.body[key];
  }
  res.json(update('orders', order.id, patch));
});

router.delete('/orders/:id', (req, res) => {
  const order = db().orders.find((o) => o.id === Number(req.params.id));
  if (!canEdit(req, order)) return res.status(404).json({ error: 'Order not found' });
  remove('orders', order.id);
  res.status(204).end();
});

/* ------------------- simple per-rep records: the same shape ------------------ */

const simpleCollections = {
  expenses: {
    required: ['category', 'amount'],
    build: (body, user) => ({
      userId: user.id,
      date: body.date || today(),
      category: body.category,
      amount: Number(body.amount) || 0,
      note: body.note || '',
    }),
  },
  collections: {
    required: ['customerId', 'amount'],
    build: (body, user) => ({
      userId: user.id,
      customerId: Number(body.customerId),
      date: body.date || today(),
      amount: Number(body.amount) || 0,
      invoiceNo: body.invoiceNo || '',
      note: body.note || '',
    }),
  },
  visits: {
    required: ['customerId'],
    build: (body, user) => ({
      userId: user.id,
      customerId: Number(body.customerId),
      date: body.date || today(),
      status: body.status === 'done' ? 'done' : 'planned',
      note: body.note || '',
    }),
  },
  calls: {
    required: ['customerId'],
    build: (body, user) => ({
      userId: user.id,
      customerId: Number(body.customerId),
      date: body.date || today(),
      type: body.type || 'follow-up',
      minutes: Number(body.minutes) || 0,
      note: body.note || '',
    }),
  },
};

for (const [name, config] of Object.entries(simpleCollections)) {
  router.get(`/${name}`, (req, res) => res.json(scope(req, db()[name])));

  router.post(`/${name}`, (req, res) => {
    const body = req.body || {};
    const missing = config.required.filter((field) => body[field] === undefined || body[field] === '');
    if (missing.length) return res.status(400).json({ error: `Missing: ${missing.join(', ')}` });
    res.status(201).json(insert(name, config.build(body, req.user)));
  });

  router.put(`/${name}/:id`, (req, res) => {
    const row = db()[name].find((r) => r.id === Number(req.params.id));
    if (!canEdit(req, row)) return res.status(404).json({ error: 'Record not found' });
    const { id, userId, createdAt, ...patch } = req.body || {};
    res.json(update(name, row.id, patch));
  });

  router.delete(`/${name}/:id`, (req, res) => {
    const row = db()[name].find((r) => r.id === Number(req.params.id));
    if (!canEdit(req, row)) return res.status(404).json({ error: 'Record not found' });
    remove(name, row.id);
    res.status(204).end();
  });
}

/**
 * Check in at a visit. The rep's phone sends its coordinates; the server
 * records them with the distance to the customer, so a team leader can see a
 * visit was made on site rather than from the car park across town.
 */
router.post('/visits/:id/checkin', (req, res) => {
  const visit = db().visits.find((v) => v.id === Number(req.params.id));
  if (!visit || visit.userId !== req.user.id) {
    return res.status(404).json({ error: 'Visit not found' });
  }
  if (visit.status === 'done') {
    return res.status(409).json({ error: 'This visit is already checked in' });
  }

  const { lat, lng, accuracy } = req.body || {};
  const customer = db().customers.find((c) => c.id === visit.customerId);
  const position =
    Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
      ? { lat: Number(lat), lng: Number(lng) }
      : null;
  const distance = distanceBetween(position, customer);

  res.json(
    update('visits', visit.id, {
      status: 'done',
      checkedInAt: new Date().toISOString(),
      lat: position?.lat ?? null,
      lng: position?.lng ?? null,
      accuracy: accuracy != null ? Math.round(Number(accuracy)) : null,
      distanceM: distance,
      // Within 250m of the recorded address counts as on-site.
      verified: distance != null && distance <= 250,
    }),
  );
});

export default router;
