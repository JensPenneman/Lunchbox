# Lunchbox

Belgian multi-frontend lunch ordering platform. Nx monorepo PoC covering the end-to-end flow: a customer orders a sandwich from a merchant, pays (simulated), merchant sees the order and advances it through prep states, customer gets an email confirmation + a downloadable Peppol UBL invoice, and the accountant sees the whole thing aggregated with VAT broken down by rate. Fully local — no cloud services involved.

> **License:** PolyForm Noncommercial 1.0.0. See `LICENSE`.

## What's inside

```
lunchbox/
├── apps/
│   ├── api/         Fastify + tRPC + BetterAuth    → http://localhost:4000
│   ├── store/       Next.js — customer ordering    → http://localhost:4100
│   ├── merchant/    Next.js — merchant dashboard   → http://localhost:4200
│   ├── supplier/    Next.js — supplier stub        → http://localhost:4300
│   ├── accounting/  Next.js — VAT ledger           → http://localhost:4400
│   └── e2e/         Playwright golden-path test
├── libs/
│   ├── contracts/      Zod schemas — shared source of truth for DTOs and validation
│   ├── db/             Prisma schema + client singleton + seed
│   ├── auth/           BetterAuth configuration (self-hosted, no vendor)
│   ├── trpc-server/    Modular tRPC routers (me / tenants / orders / merchant / accounting / invoicing)
│   │                   + Peppol UBL BIS 3.0 XML renderer
│   ├── trpc-client/    React Query adapter, auth client, download helper
│   ├── ui/             Tailwind component library (button, card, badge, order-progress, …)
│   ├── i18n/           NL / FR / EN message dictionaries + <I18nProvider> + useT() hook
│   └── notifications/  Nodemailer transport + order confirmation templates
├── brainstorm/         Research and schema notes (input, not code)
├── docker-compose.yml  Postgres 18 (5433) + Mailpit SMTP catcher (1025 + UI on 8025)
└── .nvmrc              Node 25.9.0 for local dev; production uses LTS 22
```

Everything runs locally. No cloud services required. Docker spins up Postgres and Mailpit; npm scripts do the rest.

## Tech choices

- **Nx 22** monorepo (Project Crystal / inferred tasks), **npm** workspaces.
- **Fastify + tRPC v11** for the API (not NestJS — tRPC v11 is the canonical pattern for end-to-end-typed TS; NestJS's DI is redundant here). Modular code organization per domain keeps the monolith shape.
- **Zod + superjson** — single source of truth for contracts, shared across backend and all frontends.
- **Prisma 6** on **Postgres 18** via docker-compose.
- **BetterAuth 1.2** — self-hosted email+password, no auth vendor.
- **Next.js 15** App Router + **Tailwind 4** for all four frontends.
- **Zustand** for client-side cart state with localStorage persistence.
- **Nodemailer** → **Mailpit** for local SMTP capture (email never leaves your machine).
- **Playwright** for cross-app e2e.

Money is stored as integer **cents**; VAT rates as integer **basis points** (600, 1200, 2100). No floating point ever touches money.

## Prerequisites

- Node 25.9.0 via `nvm` (a `.nvmrc` is committed — your shell may switch automatically). Node ≥ 22 works; LTS 22 is the production target.
- Docker.

## First-time setup

```bash
nvm use                         # reads .nvmrc
cp .env.example .env            # defaults work as-is for local dev
npm install                     # installs all workspaces

docker compose up -d            # starts Postgres on :5433 and Mailpit on :1025 + :8025
npm run db:generate             # Prisma client
npm run db:migrate              # creates tables
npm run db:seed                 # seeds users, tenants, products, 12 historical orders
```

Or just run everything in one go:

```bash
npm run setup
```

## Running the apps

```bash
npm run dev
```

This runs all five apps in parallel (API + 4 frontends). Or run one at a time:

```bash
npx nx run @lunchbox/api:dev
npx nx run @lunchbox/store:dev
npx nx run @lunchbox/merchant:dev
npx nx run @lunchbox/supplier:dev
npx nx run @lunchbox/accounting:dev
```

### Local URLs

| URL                                 | What                                               |
|-------------------------------------|----------------------------------------------------|
| http://localhost:4000/health        | API healthcheck                                    |
| http://localhost:4000/trpc/\*       | tRPC endpoint                                      |
| http://localhost:4000/api/auth/\*   | BetterAuth                                         |
| http://localhost:4100               | Store (customer) — trilingual, NL default          |
| http://localhost:4200               | Merchant dashboard                                 |
| http://localhost:4300               | Supplier (stub)                                    |
| http://localhost:4400               | Accounting (VAT ledger, UBL invoice downloads)     |
| http://localhost:8025               | **Mailpit** — see every email the platform sends   |
| http://localhost:5555               | Prisma Studio (via `npm run db:studio`)            |

## Demo accounts

All seeded accounts use password `lunchbox`.

| Email                       | Role                                | Sign in at           |
|-----------------------------|-------------------------------------|----------------------|
| `customer@lunchbox.test`    | Regular customer                    | store (4100)         |
| `merchant@lunchbox.test`    | Owner of both seeded tenants        | merchant (4200)      |
| `accountant@lunchbox.test`  | `ACCOUNTANT` platform role          | accounting (4400)    |
| `supplier@lunchbox.test`    | Supplier (stub app)                 | supplier (4300)      |

You can also sign up fresh in the store — the usual email+password flow.

## Golden path (manual run-through)

1. Open **store** (http://localhost:4100). Switch language to FR or EN via the NL/FR/EN toggle in the header.
2. Sign in as `customer@lunchbox.test`.
3. Pick **Jan's Broodjes**, add a few sandwiches to the cart.
4. Go to the cart, click **Place order** → you land on the checkout page.
5. Click **Pay now (simulated)** → order goes `PENDING_PAYMENT → PAID`, and:
    - A confirmation email is sent to the customer.
    - A "new order" email is sent to the tenant owner (merchant).
    - Check both at http://localhost:8025.
6. The checkout page now shows an **order progress timeline** and a **Download UBL invoice** button.
7. Open **merchant** (http://localhost:4200), sign in as `merchant@lunchbox.test`.
8. Click **Live orders** on Jan's Broodjes → the order is there with KPIs for today (orders, revenue, VAT). The page polls every 5 seconds.
9. Click **Accept → Start preparing → Ready for pickup → Fulfilled**.
10. The customer's checkout page auto-updates as the status advances (it polls every 5s too).
11. Open **accounting** (http://localhost:4400), sign in as `accountant@lunchbox.test` → see:
    - Platform-wide totals (orders, subtotal, VAT, gross).
    - **VAT by rate** (6%, 12%, 21%) with taxable base and collected VAT per rate.
    - Per-tenant breakdown with BTW numbers.
    - Recent orders with a **UBL invoice download** button per order — the XML is generated on demand using the Peppol BIS 3.0 template.

## Tests

```bash
npm test                  # Vitest across contracts, api, and trpc-server
npx nx run @lunchbox/e2e:install-browsers   # one-time Playwright setup
npm run dev               # leave running in one terminal
npm run test:e2e          # Playwright in another
```

Current coverage: **8 unit tests** (VAT math, order math, UBL renderer shape + XML escaping).

## Architectural notes

- **Modular monolith, not microservices.** `apps/api` is one deployable. Modules live under `libs/trpc-server/src/modules/` with independent responsibilities — extract to separate services later without touching callers.
- **One BetterAuth instance** serves all four frontends from `http://localhost:4000/api/auth/*`. Sessions are cookies with `credentials: 'include'` on the client side; CORS trusts the four frontend origins.
- **No SSR / RSC for tRPC** — everything is client-rendered via TanStack Query. Simpler mental model; can be upgraded to RSC-aware fetching later.
- **Price snapshots on `OrderItem`** — menu edits don't mutate order history.
- **VAT:** `product.vatRate` is per-item basis points. Takeaway prepared meals default to **12%** (the Belgian 2026 rate); cold drinks at **21%**; cold/grocery items at **6%**. VAT is derived with integer math in `computeVatSplit`; the round-trip `subtotal + vat === total` is tested.
- **Peppol:** we render UBL BIS 3.0 XML in `libs/trpc-server/src/peppol/ubl.ts`. For production, hand the generated XML to a certified Peppol Access Point (Storecove / Ibanity / Chift) which handles validation, signing, and network delivery.
- **Emails** are captured locally by Mailpit. Swap `SMTP_HOST` / `SMTP_PORT` in `.env` to point at a real SMTP provider in production (Postmark, SES, etc.).
- **i18n** is cookie-free and client-only: message dictionaries under `libs/i18n/src/messages/`, `<I18nProvider>` sets `<html lang>` and persists the choice to `localStorage`. Upgrade to `next-intl` with route-based locales when SEO demands it.
- **Group orders, companies/B2B, supplier module, custom-domain storefronts** are intentionally out of PoC scope. See `brainstorm/data-model.md` for the full target model.

## Scripts cheat sheet

```bash
npm run dev           # all apps, parallel
npm run build         # all apps
npm run typecheck
npm test              # unit tests
npm run test:e2e      # Playwright
npm run db:up         # docker compose up -d db
npm run db:down
npm run db:reset      # nuke volume, re-migrate, re-seed
npm run db:studio     # Prisma Studio on localhost:5555
npm run clean         # remove node_modules + dist and reinstall
```

## What's seeded on first run

- **4 users** (password `lunchbox`): customer, merchant, accountant (platform role), supplier.
- **2 tenants**: Jan's Broodjes (Gent, NL) and Le Baguette (Brussels, FR) — both owned by the merchant user.
- **9 products** with realistic pricing, VAT rates (6% for cold drinks, 12% for takeaway sandwiches, 21% for soft drinks).
- **12 historical orders** across the last 5 days — so the accounting ledger and merchant stats aren't empty on first launch.

## CI

`.github/workflows/ci.yml` runs on every push:
- Spins up a Postgres 18 service container
- Node 22 LTS (production target)
- `db:generate` → `migrate:deploy` → `typecheck` → unit tests → `build`

## Next things worth building

Highest-leverage additions, in rough order:

1. **Real payment integration** — Payconiq by Bancontact (covers Bancontact + Edenred/Monizze/Pluxee meal vouchers via one QR flow). Slot in behind the `orders.markPaid` call.
2. **Peppol delivery** via an access-point provider — we generate UBL already; swap the download-only path for real network delivery via Storecove / Ibanity / Chift.
3. **Group orders** — the schema is sketched in `brainstorm/data-model.md`; biggest single differentiator vs Smosser.
4. **Custom domains per tenant** — storefront table is there, just need routing middleware.
5. **SSE / WebSocket for live order updates** — currently polls every 5s on the merchant and checkout pages, which works fine but isn't ideal under load.
6. **BetterAuth `additionalFields` type generation** — run the CLI to emit typed user objects so client code can read `session.user.platformRole` without DB round-trips.
7. **Route-based i18n** — move from client-only `useT()` to `next-intl` with `/[locale]/…` routes when SEO matters.
8. **Nx module-boundary ESLint** — enforce the `scope:*` / `type:*` tags that `project.json` files already declare.
