import fs from 'node:fs';
import path from 'node:path';

// Prototype persistence: a single JSON document written through on every change.
// Small enough for demo volumes and it keeps the deploy free of native modules.
// Point DATA_DIR at a Railway volume to keep data across redeploys.
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const empty = {
  users: [],
  zones: [],
  companies: [],
  products: [],
  customers: [],
  orders: [],
  expenses: [],
  collections: [],
  visits: [],
  calls: [],
  promotions: [],
};

let state = structuredClone(empty);
let writeQueued = false;

export function load() {
  try {
    state = { ...structuredClone(empty), ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) };
  } catch {
    state = structuredClone(empty);
  }
  return state;
}

export function db() {
  return state;
}

export function save() {
  if (writeQueued) return;
  writeQueued = true;
  queueMicrotask(() => {
    writeQueued = false;
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2));
  });
}

export function isEmpty() {
  return state.users.length === 0;
}

export function nextId(collection) {
  const rows = state[collection];
  return rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
}

export function insert(collection, row) {
  const record = { ...row, id: nextId(collection), createdAt: new Date().toISOString() };
  state[collection].push(record);
  save();
  return record;
}

export function update(collection, id, patch) {
  const row = state[collection].find((r) => r.id === Number(id));
  if (!row) return null;
  Object.assign(row, patch, { updatedAt: new Date().toISOString() });
  save();
  return row;
}

export function remove(collection, id) {
  const index = state[collection].findIndex((r) => r.id === Number(id));
  if (index === -1) return false;
  state[collection].splice(index, 1);
  save();
  return true;
}
