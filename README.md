# EliaVit — Pharmaceutical Sales Record App

A field-sales record app for a pharmaceutical company. Medical representatives
record what they do in the field — orders, returns, bonuses, expenses, money
collected, visits and calls — and their team leader and the general sales
manager see the same records rolled up per staff member, zone, company and
product.

Built as a mobile-first web app so it runs in any phone browser and deploys as a
single service on Railway.

## Roles

| Role | Sees | Typical user |
|---|---|---|
| `rep` | Only their own records and customers | Medical representative |
| `supervisor` | Their own records plus everyone reporting to them | Team leader |
| `manager` | Every record in the company | General sales manager |

Visibility is enforced on the server (`visibleUserIds` in `server/auth.js`), not
in the UI, so a rep cannot read another rep's data by calling the API directly.

## Screens

- **Login / Register** — sign in, or register as a new representative.
- **Home** — this month's net sales, counters for orders / returns / expenses /
  collections / calls, a quick-action grid, today's visits and recent activity.
- **Order & Return entry** — pick a customer, add products with quantity, bonus
  units, price and a per-line discount; the total is calculated as you type.
- **Orders list** — everything recorded, filterable by orders / returns.
- **Sales Report** — filter by staff, order type, customer type, company, zone,
  customer, product and date range, then view it grouped **by product** or
  **by order**.
- **Team Activity** — for leaders and managers: net sales, orders, money
  collected, expenses, visits and calls per staff member over a date range.
- **Customers** — add, search and remove customers by type and zone.
- **Money Collector, Expenses, Visit Plan, Calls** — day-to-day field records.
- **Promotions** — current campaigns per company.
- **Profile** — edit details, change password, delete account, logout.

## Demo accounts

Seeded on first boot. Password for all three: `demo1234` (override with
`DEMO_PASSWORD` before the first start).

| Username | Role |
|---|---|
| `rep` | Medical representative |
| `leader` | Team leader (sees 2 reps) |
| `manager` | General sales manager (sees everyone) |

The login screen has one-tap buttons for each.

## Running locally

```bash
npm install
npm run dev          # API on :3000, Vite dev server on :5173 with /api proxied
```

Open http://localhost:5173.

To run exactly what Railway runs:

```bash
npm install
npm run build        # builds the React client into client/dist
npm start            # Express serves the API and the built client on :3000
```

## Deploying to Railway

1. **New Project → Deploy from GitHub repo**, and pick this repository.
2. Railway reads `railway.json` / `nixpacks.toml` and runs
   `npm install && npm run build`, then `npm start`. No build config needed.
3. Under **Variables**, set:
   - `SESSION_SECRET` — a long random string (required; sessions are signed with it).
   - `DEMO_PASSWORD` — optional, changes the seeded accounts' password.
4. **Recommended:** add a **Volume** mounted at `/data` and set `DATA_DIR=/data`.
   Without it the JSON data file lives in the container's ephemeral filesystem
   and resets on every redeploy.
5. Generate a domain under **Settings → Networking**. Railway sets `PORT`
   itself — the server reads it.

Health check: `GET /api/health`.

## Project layout

```
server/
  index.js          Express app, auth endpoints, serves the built client
  db.js             JSON-file store (no native modules, so builds are portable)
  auth.js           Password hashing, signed tokens, role-based visibility
  seed.js           Demo company, staff, products, customers and history
  routes/
    catalog.js      Zones, companies, products, customers, promotions
    records.js      Orders, returns, expenses, collections, visits, calls
    reports.js      Sales report, home dashboard, team activity, staff list
client/
  src/pages/        One file per screen
  src/components/   App bar, drawer, tab bar, icons
  src/lib/          Typed API client, auth context, formatters
  src/styles/       Design tokens and component styles
```

## API

All endpoints are under `/api` and need `Authorization: Bearer <token>` except
`/api/health`, `/api/auth/login` and `/api/auth/register`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/login`, `/auth/register` | Get a token |
| GET/PUT/DELETE | `/me`, `/me/password` | Profile, password, delete account |
| GET | `/dashboard` | Home screen figures |
| GET | `/sales` | Sales report (`reportType=product\|order` plus filters) |
| GET | `/team` | Per-staff performance (leaders and managers only) |
| GET/POST/PUT/DELETE | `/customers` | Customer book |
| GET/POST/PUT/DELETE | `/orders` | Orders and returns |
| GET/POST/PUT/DELETE | `/expenses`, `/collections`, `/visits`, `/calls` | Field records |
| GET | `/products`, `/companies`, `/zones`, `/promotions`, `/staff` | Reference data |

## Notes on this prototype

- Data lives in a single JSON file. It is fine for a demo and for tens of
  thousands of records, but a real deployment should move `server/db.js` to
  Postgres (Railway provides one in a click).
- Tokens are HMAC-signed and expire after 12 hours; passwords are hashed with
  scrypt. There is no password reset flow yet.
- Deleting an account is a soft delete, so the manager's historical reports stay
  correct.
