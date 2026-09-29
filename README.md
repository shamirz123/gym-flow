# GymFlow — Multi-tenant Gym Management SaaS

One platform, many gyms. Every gym gets its own **website on a subdomain**, a **members and fee system**, **QR attendance** and **staff roles** — and the platform owner earns a monthly subscription from each gym.

**Stack:** Next.js 16 (App Router, TypeScript) · Express 5 (TypeScript) · PostgreSQL + Prisma 7 · Zod · Stripe · Vitest · Docker · GitHub Actions

```
                     ┌──────────────────────────────── Next.js (frontend) ────────────────────────────────┐
 localhost:3000  ───▶│  /            SaaS landing + pricing          /signup  register a gym (14-day trial) │
 ironpulse.localhost │  proxy.ts:  <slug>.domain  →  /sites/<slug>   (each gym's own website)               │
 titan.localhost ───▶│  /dashboard   staff dashboard (menu depends on role)    /card/<token>  member QR card │
                     └──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                                                │ REST (JWT + x-gym-id)
                     ┌──────────────────────────────── Express API (backend) ─────────────────────────────┐
                     │  requireAuth → requireGym (tenant) → requireActiveSubscription → requirePerm         │
                     │  every query scoped by gymId  ·  Zod validation  ·  Stripe webhook                   │
                     └──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                                                │ Prisma 7 (driver adapter)
                                                         PostgreSQL 17
```

## Features
| | |
|---|---|
| **Multi-tenant** | All data is isolated by `gymId`. Tests prove that one gym can never read or change another gym's data |
| **Subdomain websites** | `ironpulse.gymflow.pk` — animated website with a trial form, class booking, BMI calculator, SEO and a share image |
| **Roles** | **Owner** (everything) · **Receptionist** (members, fees, check-ins, inbox — no revenue) · **Trainer** (view members, check-ins) |
| **QR attendance** | Every member gets a digital card (`/card/<token>`). Check in with a camera, a USB scanner or by name. Members with overdue fees are refused. A second scan within 3 hours counts as the same visit |
| **Members & fees** | Collecting a fee extends the expiry automatically. WhatsApp reminders, payment history, CSV export |
| **SaaS billing** | Starter (Rs 4,999) / Pro (Rs 9,999). 14-day trial and plan limits (members/staff). When the trial ends, the dashboard becomes read-only and the website goes offline. Stripe Checkout + webhook |
| **Platform admin** | All gyms, MRR, trial extensions |

## Run it locally

**Requirements:** Node.js 20+ (24 recommended)

```bash
npm run setup          # first time: install all packages
```

**1. Start the database** — either:
```bash
npm run db:local       # no Docker: runs a local PostgreSQL 17 (keep it running in its own terminal)
npm run db:docker      # or with Docker (needs Docker Desktop + WSL on Windows)
```

**2. Create tables + demo data** (first time):
```bash
npm run db:migrate
npm run db:seed        # ⚠️ wipes the database and loads demo data
```

**3. Start the app:**
```bash
npm run dev            # API :5050 + Web :3000
```

| URL | What it is |
|---|---|
| http://localhost:3000 | GymFlow landing page |
| http://ironpulse.localhost:3000 | Iron Pulse's website (Pro, active) |
| http://titan.localhost:3000 | Titan Fitness's website (trial) |
| http://localhost:3000/dashboard | Staff dashboard |

`*.localhost` works out of the box in Chrome, Edge and Firefox — no setup needed.

### Demo logins
| Role | Email | Password |
|---|---|---|
| Platform admin + Iron Pulse Owner | `admin@gym.com` | `admin12345` |
| Iron Pulse Receptionist | `reception@ironpulse.pk` | `demo12345` |
| Iron Pulse Trainer | `trainer@ironpulse.pk` | `demo12345` |
| Titan Fitness Owner (trial) | `owner@titan.pk` | `demo12345` |

## Tests
```bash
npm test               # 39 tests: tenant isolation, roles, fees, QR attendance, billing, plan limits, signup
```
Tests run against a separate database (`gymflow_test`), so your dev data is never touched.

## Stripe (test mode — free)
Without Stripe keys, billing runs in **demo mode** (plans activate instantly). For real Stripe Checkout:
1. Create a free account at stripe.com → **Test mode** → Developers → API keys → copy `sk_test_...`
2. Set `STRIPE_SECRET_KEY=sk_test_...` in `backend/.env`
3. Webhook (local): install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and run
   ```bash
   stripe listen --forward-to localhost:5050/api/billing/webhook
   ```
   then put the `whsec_...` it prints into `STRIPE_WEBHOOK_SECRET`
4. Test card: `4242 4242 4242 4242`, any future date and CVC

> Stripe doesn't support live payments for Pakistani businesses. For real gyms, JazzCash/EasyPaisa/Safepay can be added later — that's why billing lives in its own module (`lib/billing.ts`).

## Docker
```bash
npm run docker:up      # Postgres + API + Web, all in containers
docker compose --profile app run --rm api node dist/seed.js --force   # demo data (first time)
```

## Deploy
- **Database:** Neon / Render / Railway PostgreSQL → `DATABASE_URL`
- **API:** Render/Railway (Dockerfile, or `npm run build && npm start`). Env: `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL=https://gymflow.pk`, `ROOT_DOMAIN=gymflow.pk`, Stripe keys
- **Web:** Vercel. Env: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_ROOT_DOMAIN=gymflow.pk`. For subdomains, add your own domain with **wildcard DNS** (`*.gymflow.pk`) on Vercel
- Camera scanning needs **https** (localhost works without it)

## Project structure
```
backend/
  prisma/schema.prisma      tenants, users, roles, members, payments, attendance, content
  src/lib/auth.ts           JWT + tenant check + role permissions + subscription gate
  src/lib/permissions.ts    who can do what
  src/lib/billing.ts        Stripe / demo billing + webhook
  src/routes/gym/*          dashboard APIs (every query scoped by gymId)
  src/routes/public.ts      gym websites, forms, member card
  tests/*                   vitest + supertest
frontend/
  src/proxy.ts              subdomain → /sites/<slug>
  src/app/(marketing)       SaaS landing page
  src/app/sites/[slug]      gym website
  src/app/dashboard/*       staff dashboard
  src/app/card/[token]      member digital card
```

## Notes
- `npm audit` in the backend reports `mysql2` warnings — they come from the Prisma CLI's MySQL support; this project only uses PostgreSQL.
- The original single-gym MongoDB version is preserved in the git tag `v1-single-gym-mongodb`.
