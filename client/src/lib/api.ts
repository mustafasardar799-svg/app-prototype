export type Role = 'rep' | 'supervisor' | 'manager';

export interface User {
  id: number;
  username: string;
  name: string;
  role: Role;
  title: string;
  phone: string;
  currency: string;
  supervisorId: number | null;
  zoneId: number | null;
  avatar?: string;
  target?: number;
}

export interface TrendPoint { month: string; net: number; orders: number }

export interface LeaderboardRow {
  id: number; name: string; role: Role; target: number; net: number;
  orders: number; attainment: number | null; isMe: boolean; rank: number;
}

export interface Zone { id: number; name: string }
export interface Company { id: number; name: string }
export interface Product { id: number; name: string; companyId: number; price: number; unit: string }
export interface Customer {
  id: number; name: string; type: string; zoneId: number | null;
  ownerId: number; phone: string; address: string;
  lat?: number | null; lng?: number | null;
}
export interface OrderLine { productId: number; qty: number; bonus: number; price: number; discount: number }
export interface Order {
  id: number; code: string; userId: number; customerId: number;
  type: 'order' | 'return'; date: string; lines: OrderLine[];
  total: number; status: string; note: string;
  signature?: string; signedBy?: string;
}
export interface Expense { id: number; userId: number; date: string; category: string; amount: number; note: string }
export interface Collection {
  id: number; userId: number; customerId: number; date: string;
  amount: number; invoiceNo: string; note: string;
}
export interface Visit {
  id: number; userId: number; customerId: number; date: string; status: string; note: string;
  checkedInAt?: string; lat?: number | null; lng?: number | null;
  accuracy?: number | null; distanceM?: number | null; verified?: boolean;
}
export interface Call {
  id: number; userId: number; customerId: number; date: string;
  type: string; minutes: number; note: string;
}
export interface Promotion {
  id: number; title: string; companyId: number; from: string; to: string; description: string;
}

export interface Dashboard {
  month: string; currency: string;
  target: number; attainment: number | null; pace: number;
  trend: TrendPoint[];
  salesTotal: number; returnsTotal: number; netTotal: number;
  collectedTotal: number; expenseTotal: number;
  counts: Record<'orders' | 'returns' | 'expenses' | 'collections' | 'calls' | 'customers', number>;
  todayVisits: (Visit & { customer: string })[];
  recentOrders: { id: number; code: string; date: string; type: string; total: number; customer: string; staff: string }[];
}

export interface SalesReport {
  reportType: 'product' | 'order';
  summary: {
    orders: number; returns: number; salesTotal: number;
    returnsTotal: number; netTotal: number; customers: number;
  };
  rows: Record<string, string | number>[];
}

export interface TeamMember extends User {
  zone: string; orders: number; returns: number;
  salesTotal: number; returnsTotal: number; netTotal: number;
  collected: number; expenses: number; visits: number; calls: number; lastActivity: string;
  target: number; attainment: number | null;
}

import { enqueue, flushQueue, type QueuedWrite } from './offline';

const TOKEN_KEY = 'eliavit.token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number, cause?: Error) {
    super(message);
    this.status = status;
    this.cause = cause;
  }
}

/**
 * Thrown when a write could not reach the server and was parked on the phone.
 * It carries a translation key rather than a sentence: this layer has no access
 * to the active language.
 */
export class OfflineQueuedError extends Error {
  labelKey: string;
  constructor(labelKey: string) {
    super(`queued:${labelKey}`);
    this.name = 'OfflineQueuedError';
    this.labelKey = labelKey;
  }
}

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function authHeaders(body?: BodyInit | null) {
  const token = getToken();
  return {
    ...(body ? { 'content-type': 'application/json' } : {}),
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

function sendRaw(path: string, options: RequestInit = {}) {
  return fetch(`/api${path}`, {
    ...options,
    headers: { ...authHeaders(options.body), ...options.headers },
  });
}

async function request<T>(path: string, options: RequestInit = {}, label?: string): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const isWrite = WRITE_METHODS.has(method);

  let response: Response;
  try {
    response = await sendRaw(path, options);
  } catch (networkError) {
    // A write we cannot deliver is parked rather than lost; a read just fails.
    if (isWrite && label) {
      enqueue({ path, method, body: String(options.body || ''), label });
      throw new OfflineQueuedError(label);
    }
    throw new ApiError('noConnection', 0, networkError instanceof Error ? networkError : undefined);
  }

  if (response.status === 401) {
    clearToken();
    if (!location.pathname.startsWith('/login')) location.assign('/login');
    throw new ApiError('sessionExpired', 401);
  }
  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(payload.error || 'Request failed', response.status);
  return payload as T;
}

/** Replays anything parked while the phone was offline. */
export function syncQueued() {
  return flushQueue((entry: QueuedWrite) =>
    sendRaw(entry.path, {
      method: entry.method,
      body: entry.body || undefined,
    }),
  );
}

const query = (params: Record<string, string | number | undefined | null>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
};

type Params = Record<string, string | number | undefined | null>;

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  register: (body: { username: string; password: string; name: string; phone?: string }) =>
    request<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  me: () => request<User>('/me'),
  updateMe: (body: Partial<User>) => request<User>('/me', { method: 'PUT', body: JSON.stringify(body) }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<{ ok: true }>('/me/password', { method: 'PUT', body: JSON.stringify(body) }),
  deleteMe: () => request<void>('/me', { method: 'DELETE' }),

  zones: () => request<Zone[]>('/zones'),
  companies: () => request<Company[]>('/companies'),
  products: (params: Params = {}) => request<Product[]>(`/products${query(params)}`),
  promotions: () => request<Promotion[]>('/promotions'),
  staff: () => request<User[]>('/staff'),

  customers: (params: Params = {}) => request<Customer[]>(`/customers${query(params)}`),
  createCustomer: (body: Partial<Customer>) =>
    request<Customer>('/customers', { method: 'POST', body: JSON.stringify(body) }, 'queueCustomer'),
  updateCustomer: (id: number, body: Partial<Customer>) =>
    request<Customer>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCustomer: (id: number) => request<void>(`/customers/${id}`, { method: 'DELETE' }),

  orders: (params: Params = {}) => request<Order[]>(`/orders${query(params)}`),
  order: (id: number) => request<Order>(`/orders/${id}`),
  createOrder: (body: unknown) =>
    request<Order>('/orders', { method: 'POST', body: JSON.stringify(body) }, 'queueOrder'),
  deleteOrder: (id: number) => request<void>(`/orders/${id}`, { method: 'DELETE' }),

  expenses: (params: Params = {}) => request<Expense[]>(`/expenses${query(params)}`),
  createExpense: (body: unknown) =>
    request<Expense>('/expenses', { method: 'POST', body: JSON.stringify(body) }, 'queueExpense'),
  deleteExpense: (id: number) => request<void>(`/expenses/${id}`, { method: 'DELETE' }),

  collections: (params: Params = {}) => request<Collection[]>(`/collections${query(params)}`),
  createCollection: (body: unknown) =>
    request<Collection>('/collections', { method: 'POST', body: JSON.stringify(body) }, 'queueCollection'),
  deleteCollection: (id: number) => request<void>(`/collections/${id}`, { method: 'DELETE' }),

  visits: (params: Params = {}) => request<Visit[]>(`/visits${query(params)}`),
  createVisit: (body: unknown) =>
    request<Visit>('/visits', { method: 'POST', body: JSON.stringify(body) }, 'queueVisit'),
  updateVisit: (id: number, body: unknown) =>
    request<Visit>(`/visits/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteVisit: (id: number) => request<void>(`/visits/${id}`, { method: 'DELETE' }),

  calls: (params: Params = {}) => request<Call[]>(`/calls${query(params)}`),
  createCall: (body: unknown) =>
    request<Call>('/calls', { method: 'POST', body: JSON.stringify(body) }, 'queueCall'),
  deleteCall: (id: number) => request<void>(`/calls/${id}`, { method: 'DELETE' }),

  dashboard: () => request<Dashboard>('/dashboard'),
  trend: (months = 6) => request<TrendPoint[]>(`/trend?months=${months}`),
  leaderboard: (params: Params = {}) =>
    request<{ from: string; to: string; rows: LeaderboardRow[] }>(`/leaderboard${query(params)}`),
  setTarget: (userId: number, target: number) =>
    request<User>(`/users/${userId}/target`, { method: 'PUT', body: JSON.stringify({ target }) }, 'queueTarget'),
  checkIn: (visitId: number, position: { lat?: number; lng?: number; accuracy?: number }) =>
    request<Visit>(`/visits/${visitId}/checkin`, { method: 'POST', body: JSON.stringify(position) }, 'queueCheckIn'),
  salesReport: (params: Params) => request<SalesReport>(`/sales${query(params)}`),
  team: (params: Params = {}) =>
    request<{ from: string; to: string; pace: number; members: TeamMember[] }>(`/team${query(params)}`),
};
