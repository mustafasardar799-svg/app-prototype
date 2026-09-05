import express from 'express';
import { db } from '../db.js';
import { visibleUserIds, publicUser } from '../auth.js';

const router = express.Router();

const lineTotal = (l) => l.qty * l.price * (1 - (l.discount || 0) / 100);
const round = (n) => Number(n.toFixed(2));
const monthStart = () => new Date().toISOString().slice(0, 7) + '-01';
const today = () => new Date().toISOString().slice(0, 10);

/** Net sales (orders minus returns) for a set of orders. */
function netOf(orders) {
  return round(
    orders.reduce((total, order) => total + (order.type === 'return' ? -order.total : order.total), 0),
  );
}

/**
 * How far through the month we are, 0-1. Comparing attainment against this
 * tells a rep whether they are ahead or behind pace rather than just "62%".
 */
function monthProgress() {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return now.getDate() / daysInMonth;
}

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

  // A rep is measured against their own target; a leader or manager against
  // the combined target of everyone they oversee.
  const target = [...allowed]
    .map((id) => state.users.find((u) => u.id === id))
    .filter((u) => u && !u.deleted)
    .reduce((sum, u) => sum + (u.target || 0), 0);
  const net = round(total(sales) - total(returns));

  res.json({
    month: start.slice(0, 7),
    currency: req.user.currency || 'IQD',
    target,
    attainment: target > 0 ? round((net / target) * 100) : null,
    pace: round(monthProgress() * 100),
    trend: monthlyTrend(allowed, 6),
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
    pace: round(monthProgress() * 100),
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
        target: member.target || 0,
        attainment: member.target ? round((total(sales) - total(returns)) / member.target * 100) : null,
        collected: round(inRange(state.collections, member.id).reduce((s, c) => s + c.amount, 0)),
        expenses: round(inRange(state.expenses, member.id).reduce((s, e) => s + e.amount, 0)),
        visits: inRange(state.visits, member.id).length,
        calls: inRange(state.calls, member.id).length,
        lastActivity: orders[0]?.date || '—',
      };
    }).sort((a, b) => b.netTotal - a.netTotal),
  });
});

/**
 * Net sales for each of the last `months` calendar months, oldest first.
 * Drives the trend column chart on the home and report screens.
 */
function monthlyTrend(allowed, months) {
  const state = db();
  const buckets = [];
  for (let back = months - 1; back >= 0; back -= 1) {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - back);
    buckets.push({ month: date.toISOString().slice(0, 7), net: 0, orders: 0 });
  }
  const index = new Map(buckets.map((bucket, position) => [bucket.month, position]));

  for (const order of state.orders) {
    if (!allowed.has(order.userId)) continue;
    const position = index.get(order.date.slice(0, 7));
    if (position === undefined) continue;
    buckets[position].net += order.type === 'return' ? -order.total : order.total;
    if (order.type === 'order') buckets[position].orders += 1;
  }
  return buckets.map((bucket) => ({ ...bucket, net: round(bucket.net) }));
}

router.get('/trend', (req, res) => {
  const months = Math.min(24, Math.max(3, Number(req.query.months) || 6));
  res.json(monthlyTrend(new Set(visibleUserIds(req.user)), months));
});

/**
 * Ranks every rep the caller can see by net sales this month. Reps see the
 * board too — their own row is flagged so the app can highlight it.
 */
router.get('/leaderboard', (req, res) => {
  const state = db();
  const start = req.query.from || monthStart();
  const end = req.query.to || today();
  // Everyone competes company-wide; a rep sees where they stand overall.
  const contenders = state.users.filter((u) => !u.deleted && u.role !== 'manager');

  const rows = contenders
    .map((member) => {
      const orders = state.orders.filter(
        (o) => o.userId === member.id && o.date >= start && o.date <= end,
      );
      const net = netOf(orders);
      return {
        id: member.id,
        name: member.name,
        role: member.role,
        target: member.target || 0,
        net,
        orders: orders.filter((o) => o.type === 'order').length,
        attainment: member.target ? round((net / member.target) * 100) : null,
        isMe: member.id === req.user.id,
      };
    })
    .sort((a, b) => b.net - a.net)
    .map((row, position) => ({ ...row, rank: position + 1 }));

  res.json({ from: start, to: end, rows });
});

/** Staff list for the report filters. */
router.get('/staff', (req, res) => {
  const state = db();
  res.json(visibleUserIds(req.user).map((id) => publicUser(state.users.find((u) => u.id === id))).filter(Boolean));
});

export default router;
