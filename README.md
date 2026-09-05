# EliaVit — Pharmaceutical Sales Record App

A field-sales record app for a pharmaceutical company. Medical representatives
record what they do in the field — orders, returns, bonuses, expenses, money
collected, visits and calls — and their team leader and the general sales
manager see the same records rolled up per staff member, zone, company and
product.

Built as an installable mobile web app (PWA): it runs in any phone browser,
installs to the iPhone home screen and opens full screen, keeps working with no
signal, and deploys as a single service on Railway.

## Roles

| Role | Sees | Typical user |
|---|---|---|
| `rep` | Only their own records and customers | Medical representative |
| `supervisor` | Their own records plus everyone reporting to them | Team leader |
| `manager` | Every record in the company | General sales manager |

Visibility is enforced on the server (`visibleUserIds` in `server/auth.js`), not
in the UI, so a rep cannot read another rep's data by calling the API directly.

## Languages

The app ships in three languages and switches instantly — from the login screen
(before signing in), the side menu, or Profile → Language. The choice is
remembered on the phone, and a first-time visitor gets their browser's language
automatically.

| Language | Script | Direction |
|---|---|---|
| English | Latin | left-to-right |
| کوردی (Sorani Kurdish) | Arabic | right-to-left |
| العربية (Arabic) | Arabic | right-to-left |

Right-to-left is a real layout mirror, not a text swap: the drawer opens from
the right, the tab bar reverses, the back arrow flips, dropdown carets and the
search icon move, and the target meter fills from the reading edge with the
pace marker mirrored with it.

Two deliberate exceptions stay left-to-right in every language, because
mirroring them causes misreadings rather than preventing them:

- **The trend chart.** Time runs left-to-right on the axis. A mirrored time
  axis is a well-known way to make people read a rise as a fall.
- **Digits.** Figures use Latin numerals in all three languages. Arabic and
  Sorani would otherwise render Arabic-Indic numerals, and a sales app whose
  numbers change shape between the screen, the CSV and Excel invites costly
  mistakes. Identifiers like `ORD-0007` and phone numbers are bidi-isolated so
  they never scramble inside a right-to-left sentence.

**A note on the translations:** they were written to be accurate and idiomatic
for pharmaceutical field sales in Iraq and the Kurdistan Region, but they have
not been reviewed by a native speaker. Have a Kurdish and an Arabic speaker on
your team read through the app once before it goes to real reps — terminology
for things like *bonus*, *collection* and *promotion* varies between companies,
and those words should match what your team already says. Every string lives in
`client/src/locales/`, one file per language, so corrections are a text edit.

## Typography

- **Inter** for Latin text.
- **Noto Sans Arabic** for Arabic and Sorani Kurdish, which share the Arabic
  script. It is listed as a fallback in every language, so an Arabic-script
  customer name inside an English screen still renders properly.

Both are self-hosted and only the subsets the app actually renders are bundled
(9 font files, not the 100-plus that shipping every Cyrillic, Greek and
Vietnamese face would cost). Nothing is fetched from a third party, and the
service worker precaches the fonts so typography survives going offline.

## On iPhone

The app is designed for the phone first and installs like a native one.

**To install:** open the site in Safari, tap **Share**, then **Add to Home
Screen**. The app then opens full screen with no browser chrome, uses the app
icon, and respects the notch and home indicator. (The app shows this hint
itself the first time an iPhone visits.)

What the iPhone build does properly:

- **Safe areas** — content is padded away from the notch and the home indicator
  with `env(safe-area-inset-*)`; the app bar and tab bar extend under them.
- **No zoom-on-focus** — every input is at least 16px, so iOS does not zoom the
  page when a field is tapped.
- **Native-feeling chrome** — bottom sheets instead of browser dialogs, toasts
  instead of `alert()`, a translucent blurred tab bar, no tap highlight, no
  rubber-band overscroll.
- **Dark mode** — follows the iPhone's Display setting, with a manual override
  in Profile → Appearance. The status bar colour follows the app.
- **Reduced motion** — animations collapse when the accessibility setting is on.

## Working without a signal

A medical rep is regularly in a basement pharmacy or a village with no
reception. The app is built for that:

- **It opens offline.** A service worker caches the app shell, so the app cold
  starts with no connection and stays signed in.
- **Work is never lost.** An order, expense, collection, visit or call recorded
  offline is parked on the phone and replayed, in order, the moment signal
  returns. A banner shows how many records are waiting, and Profile → Sync
  lists them with a **Sync now** button.
- **Reads stay honest.** Only writes queue. Reports are never served from a
  stale cache — showing last week's figures as if they were live would be worse
  than showing nothing.

## Screens

- **Login / Register** — sign in, or register as a new representative.
- **Home** — this month's net sales against target, a six-month trend chart,
  counters for orders / returns / expenses / collections / calls, a quick-action
  grid, today's visits and recent activity.
- **Order & Return entry** — pick a customer, add products with quantity, bonus
  units, price and a per-line discount; the total is calculated as you type. The
  customer can **sign on the phone**, and the signature is stored with the order.
- **Orders list** — everything recorded, filterable by orders / returns.
- **Sales Report** — filter by staff, order type, customer type, company, zone,
  customer, product and date range, then view it grouped **by product** or
  **by order**, as **charts or a table**. Export to **Excel or CSV**, straight
  into the iOS share sheet.
- **Team Activity** — for leaders and managers: net sales, orders, money
  collected, expenses, visits and calls per staff member over a date range, each
  with a target meter. Leaders and managers set each rep's **monthly target**
  here.
- **Ranking** — a live leaderboard of the field team by net sales this month,
  with each rep's own position highlighted.
- **Customers** — add, search and remove customers by type and zone, and **pin a
  customer's location** while standing in the shop so visit check-ins can be
  verified against it.
- **Visit Plan** — plan the route, then **check in at the customer**. The phone's
  GPS is recorded with the visit and the distance to the customer's pinned
  address is calculated, so a team leader can see the visit happened on site
  (within 250 m) rather than from across town.
- **Money Collector, Expenses, Calls** — day-to-day field records.
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
  public/           PWA manifest, service worker, app icons
  src/pages/        One file per screen
  src/components/   App bar, drawer, tab bar, charts, sheets, toasts, signature pad
  src/lib/          Typed API client, offline queue, auth, theme, i18n, xlsx/CSV export
  src/locales/      en.ts, ckb.ts, ar.ts — one file per language
  src/styles/       Design tokens (light + dark), fonts, component styles
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
| GET | `/team` | Per-staff performance and targets (leaders and managers only) |
| GET | `/trend` | Net sales per month, for the trend chart |
| GET | `/leaderboard` | Field team ranked by net sales |
| PUT | `/users/:id/target` | Set a staff member's monthly target |
| POST | `/visits/:id/checkin` | GPS check-in, with distance to the customer |
| GET/POST/PUT/DELETE | `/customers` | Customer book |
| GET/POST/PUT/DELETE | `/orders` | Orders and returns |
| GET/POST/PUT/DELETE | `/expenses`, `/collections`, `/visits`, `/calls` | Field records |
| GET | `/products`, `/companies`, `/zones`, `/promotions`, `/staff` | Reference data |

## The sales report

The report is the screen a manager lives in, so it does more than list rows.

**Filters:** staff, order type, customer type, company, zone, customer, product,
report type (by product or by order) and a date range.

**Charts** (the default view; a Table toggle shows the raw rows):

- **Net sales, last 6 months** — a column chart with the selected month emphasised.
- **Orders against returns** — the two totals side by side, with the return rate
  as a percentage.
- **Top products by value** — ranked horizontal bars, the leader emphasised.
- **Sales by zone** and **Sales by customer type** — the same ranked bars, on the
  by-order report.

**Export** — the Export button offers two formats, and both contain exactly the
rows on screen with the current filters applied, in the current language:

- **Excel (.xlsx)** — a real workbook with two sheets: `Report` (the rows) and
  `Summary` (the filters used and the headline totals). The header row is bold
  and frozen, columns are sized to their content, and **numbers are written as
  numbers**, so Excel totals and pivots them without a "convert to number" pass.
- **CSV** — UTF-8 with a byte-order mark, so Kurdish and Arabic text opens
  correctly in Excel rather than as mojibake.

The workbook is generated on the phone by `client/src/lib/xlsx.ts` — an .xlsx
file is a zip of XML parts, so it writes the handful Excel needs rather than
bundling a spreadsheet library that a rep would pay for on every app load.

## Charts and colour

The trend chart and the target meters follow one rule set, and the palette is
validated rather than eyeballed:

- **Light:** `#6C4CF1` accent, `#16A06A` good, `#EDA100` warning, `#C1272D` danger.
- **Dark:** `#9085E9`, `#199E70`, `#C98500`, `#DE4A6B` — re-stepped for the dark
  surface, not an inverted light palette.

Both sets pass a colour-blindness separation check (worst adjacent pair well
clear of the ΔE floor) and the contrast floor against their own surface. Amber
sits below 3:1 on the light surface, so every state that uses it always ships a
written label beside it — no state in this app is carried by colour alone. The
chart uses a single hue with one emphasis mark rather than a colour per bar, so
there is no legend to read.

## Notes on this prototype

- Data lives in a single JSON file. It is fine for a demo and for tens of
  thousands of records, but a real deployment should move `server/db.js` to
  Postgres (Railway provides one in a click).
- Tokens are HMAC-signed and expire after 12 hours; passwords are hashed with
  scrypt. There is no password reset flow yet.
- English is the source language and every other locale is typed against it, so
  a missing or misspelled key fails the build rather than showing a raw key to a
  rep in the field.
- Signatures are stored as small PNG data URLs on the order, capped at 64 KB.
  With many signed orders this is another reason to move to a real database.
- Visit check-ins trust the phone's reported position. That is fine as a record
  of good faith; it is not proof against someone determined to fake a location.
- Deleting an account is a soft delete, so the manager's historical reports stay
  correct.
