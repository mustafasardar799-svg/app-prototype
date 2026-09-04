import express from 'express';
import { db, insert, update, remove } from '../db.js';
import { visibleUserIds } from '../auth.js';

const router = express.Router();

router.get('/zones', (req, res) => res.json(db().zones));
router.get('/companies', (req, res) => res.json(db().companies));
router.get('/promotions', (req, res) => res.json(db().promotions));

router.get('/products', (req, res) => {
  const { companyId, q } = req.query;
  let rows = db().products;
  if (companyId) rows = rows.filter((p) => p.companyId === Number(companyId));
  if (q) rows = rows.filter((p) => p.name.toLowerCase().includes(String(q).toLowerCase()));
  res.json(rows);
});

router.get('/customers', (req, res) => {
  const allowed = new Set(visibleUserIds(req.user));
  const { zoneId, type, q } = req.query;
  let rows = db().customers.filter((c) => allowed.has(c.ownerId));
  if (zoneId) rows = rows.filter((c) => c.zoneId === Number(zoneId));
  if (type && type !== 'all') rows = rows.filter((c) => c.type === type);
  if (q) rows = rows.filter((c) => c.name.toLowerCase().includes(String(q).toLowerCase()));
  res.json(rows);
});

router.post('/customers', (req, res) => {
  const { name, type, zoneId, phone, address } = req.body || {};
  if (!name || !type) return res.status(400).json({ error: 'Name and type are required' });
  res.status(201).json(
    insert('customers', {
      name: String(name).trim(),
      type,
      zoneId: zoneId ? Number(zoneId) : req.user.zoneId,
      phone: phone || '',
      address: address || '',
      ownerId: req.user.id,
    }),
  );
});

router.put('/customers/:id', (req, res) => {
  const allowed = new Set(visibleUserIds(req.user));
  const customer = db().customers.find((c) => c.id === Number(req.params.id));
  if (!customer || !allowed.has(customer.ownerId)) return res.status(404).json({ error: 'Customer not found' });
  const { name, type, zoneId, phone, address } = req.body || {};
  res.json(
    update('customers', customer.id, {
      ...(name !== undefined && { name }),
      ...(type !== undefined && { type }),
      ...(zoneId !== undefined && { zoneId: Number(zoneId) }),
      ...(phone !== undefined && { phone }),
      ...(address !== undefined && { address }),
    }),
  );
});

router.delete('/customers/:id', (req, res) => {
  const customer = db().customers.find((c) => c.id === Number(req.params.id));
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  if (customer.ownerId !== req.user.id && req.user.role === 'rep') {
    return res.status(403).json({ error: 'You can only remove your own customers' });
  }
  remove('customers', customer.id);
  res.status(204).end();
});

export default router;
