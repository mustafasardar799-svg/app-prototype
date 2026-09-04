import express from 'express';
import { db } from '../db.js';
import { visibleUserIds, publicUser } from '../auth.js';

const router = express.Router();

const lineTotal = (l) => l.qty * l.price * (1 - (l.discount || 0) / 100);
const round = (n) => Number(n.toFixed(2));
const monthStart = () => new Date().toISOString().slice(0, 7) + '-01';
const today = () => new Date().toISOString().slice(0, 10);

/** Orders visible to the caller, narrowed by the sales-report filter set. */
function filterOrders(user, query) {
  const state = db();
  const allowed = new Set(visibleUserIds(user));
  const {
    userId, orderType = 'both', customerType = 'all',
    companyId, zoneId, customerId, productId, from, to,
  } = query;

  const productsByCompany = companyId
    ? new Set(state.products.filter((p) => p.companyId === Number(companyId)).map((p) => p.id))
    : null;

  return state.orders.filter((order) => {
    if (!allowed.has(order.userId)) return false;
    if (userId && userId !== 'all' && order.userId !== Number(userId)) return false;
    if (orderType !== 'both' && order.type !== orderType) return false;
    if (from && order.date < from) return false;
    if (to && order.date > to) return false;

    const customer = state.customers.find((c) => c.id === order.customerId);
    if (!customer) return false;
    if (customerType !== 'all' && customer.type !== customerType) return false;
    if (zoneId && zoneId !== 'all' && customer.zoneId !== Number(zoneId)) return false;
    if (customerId && customerId !== 'all' && customer.id !== Number(customerId)) return false;

    if (productId && productId !== 'all' && !order.lines.some((l) => l.productId === Number(productId))) return false;
    if (productsByCompany && !order.lines.some((l) => productsByCompany.has(l.productId))) return false;
    return true;
  });
}

/**
 * Sales report. `reportType=product` aggregates per product, `order` lists the
 * orders themselves — matching the two modes on the report screen.
 */
router.get('/sales', (req, res) => {
  const state = db();
  const orders = filterOrders(req.user, req.query);
  const reportType = req.query.reportType === 'order' ? 'order' : 'product';
  const productFilter = req.query.productId && req.query.productId !== 'all' ? Number(req.query.productId) : null;
  const companyFilter = req.query.companyId && req.query.companyId !== 'all' ? Number(req.query.companyId) : null;

  const sales = orders.filter((o) => o.type === 'order');
  const returns = orders.filter((o) => o.type === 'return');
  const sum = (rows) => round(rows.reduce((total, o) => total + o.total, 0));

  const summary = {
    orders: sales.length,
    returns: returns.length,
    salesTotal: sum(sales),
    returnsTotal: sum(returns),
    netTotal: round(sum(sales) - sum(returns)),
    customers: new Set(orders.map((o) => o.customerId)).size,
  };

  if (reportType === 'order') {
    return res.json({
      reportType,
      summary,
      rows: orders.map((order) => ({
        id: order.id,
        code: order.code,
        date: order.date,
        type: order.type,
        total: order.total,
        status: order.status,
        customer: state.customers.find((c) => c.id === order.customerId)?.name || '—',
        staff: state.users.find((u) => u.id === order.userId)?.name || '—',
        items: order.lines.length,
      })),
    });
  }

  const buckets = new Map();
  for (const order of orders) {
    for (const line of order.lines) {
      const product = state.products.find((p) => p.id === line.productId);
      if (!product) continue;
      if (productFilter && product.id !== productFilter) continue;
      if (companyFilter && product.companyId !== companyFilter) continue;

      const bucket = buckets.get(product.id) || {
        productId: product.id,
        product: product.name,
        company: state.companies.find((c) => c.id === product.companyId)?.name || '—',
        qty: 0, bonus: 0, returned: 0, total: 0,
      };
      if (order.type === 'return') {
        bucket.returned += line.qty;
        bucket.total -= lineTotal(line);
      } else {
        bucket.qty += line.qty;
        bucket.bonus += line.bonus || 0;
        bucket.total += lineTotal(line);
      }
      buckets.set(product.id, bucket);
    }
  }

  res.json({
    reportType,
    summary,
    rows: [...buckets.values()]
      .map((row) => ({ ...row, total: round(row.total) }))
      .sort((a, b) => b.total - a.total),
  });
});

/** Numbers behind the home screen: this month's net sales plus today's counts. */
router.get('/dashboard', (req, res) => {
  const state = db();
  const allowed = new Set(visibleUserIds(req.user));
  const start = monthStart();
  const now = today();
  const mine = (rows) => rows.filter((r) => allowed.has(r.userId));
  const thisMonth = (rows) => mine(rows).filter((r) => r.date >= start && r.date <= now);
  const monthOrders = thisMonth(state.orders);
  const sales = monthOrders.filter((o) => o.type === 'order');
  const returns = monthOrders.filter((o) => o.type === 'return');
  const total = (rows) => round(rows.reduce((s, o) => s + o.total, 0));

  res.json({
    month: start.slice(0, 7),
    currency: req.user.currency || 'IQD',
    salesTotal: total(sales),
    returnsTotal: total(returns),
    netTotal: round(total(sales) - total(returns)),
    collectedTotal: round(thisMonth(state.collections).reduce((s, c) => s + c.amount, 0)),
    expenseTotal: round(thisMonth(state.expenses).reduce((s, e) => s + e.amount, 0)),
    counts: {
      orders: sales.length,
      returns: returns.length,
      expenses: thisMonth(state.expenses).length,
      collections: thisMonth(state.collections).length,
      calls: thisMonth(state.calls).length,
      customers: state.customers.filter((c) => allowed.has(c.ownerId)).length,
    },
    todayVisits: mine(state.visits)
      .filter((v) => v.date === now)
      .map((visit) => ({
        ...visit,
        customer: state.customers.find((c) => c.id === visit.customerId)?.name || '—',
      })),
    recentOrders: mine(state.orders)
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id))
      .slice(0, 5)
      .map((order) => ({
        id: order.id, code: order.code, date: order.date, type: order.type, total: order.total,
        customer: state.customers.find((c) => c.id === order.customerId)?.name || '—',
        staff: state.users.find((u) => u.id === order.userId)?.name || '—',
      })),
  });
});

/** Team oversight: one row per staff member the caller supervises. */
router.get('/team', (req, res) => {
  if (req.user.role === 'rep') return res.status(403).json({ error: 'Managers and team leaders only' });
  const state = db();
  const from = req.query.from || monthStart();
  const to = req.query.to || today();
  const members = visibleUserIds(req.user)
    .filter((id) => id !== req.user.id)
    .map((id) => state.users.find((u) => u.id === id))
    .filter(Boolean);

  const inRange = (rows, userId) => rows.filter((r) => r.userId === userId && r.date >= from && r.date <= to);

  res.json({
    from,
    to,
    members: members.map((member) => {
      const orders = inRange(state.orders, member.id);
      const sales = orders.filter((o) => o.type === 'order');
      const returns = orders.filter((o) => o.type === 'return');
      const total = (rows) => round(rows.reduce((s, o) => s + o.total, 0));
      return {
        ...publicUser(member),
        zone: state.zones.find((z) => z.id === member.zoneId)?.name || '—',
        orders: sales.length,
        returns: returns.length,
        salesTotal: total(sales),
        returnsTotal: total(returns),
        netTotal: round(total(sales) - total(returns)),
        collected: round(inRange(state.collections, member.id).reduce((s, c) => s + c.amount, 0)),
        expenses: round(inRange(state.expenses, member.id).reduce((s, e) => s + e.amount, 0)),
        visits: inRange(state.visits, member.id).length,
        calls: inRange(state.calls, member.id).length,
        lastActivity: orders[0]?.date || '—',
      };
    }).sort((a, b) => b.netTotal - a.netTotal),
  });
});

/** Staff list for the report filters. */
router.get('/staff', (req, res) => {
  const state = db();
  res.json(visibleUserIds(req.user).map((id) => publicUser(state.users.find((u) => u.id === id))).filter(Boolean));
});

export default router;
