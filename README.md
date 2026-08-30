# JobHunt — AI Job Hunting SaaS (MVP)

Know which tech jobs are worth applying to. JobHunt scores every job against your
real skills, experience, location, salary expectation and work eligibility, then
gives a clear **Apply / Maybe / Don't Apply** verdict — plus CV tailoring, cover
letters, interview prep and an application tracker.

Target users: software, DevOps, cloud, SRE, data, security and QA engineers in the
**United States** and **United Kingdom**.

## Stack

- **Next.js 15** (App Router, React 19, TypeScript strict)
- **PostgreSQL 17 + Prisma**
- **Auth.js v5** (email/password + Google OAuth)
- **Tailwind CSS v4 + shadcn/ui**
- **Stripe** subscriptions (Free / Pro)
- Provider abstractions for **AI** (`mock` / `anthropic` / `openai`),
  **jobs** (`mock` / `adzuna`), **storage** (`local` / `s3`),
  **email** (`console` / `resend`) and **rate limiting** (`memory` / `postgres` / `redis`)
- **Vitest** (unit + integration) and **Playwright** (e2e)

The app runs end-to-end with **zero third-party credentials** using the mock
providers.

## Local development

```bash
# 1. Install
npm install

# 2. Start Postgres (either)
docker compose up -d db           # via Docker
# ...or use a local PostgreSQL and create a `jobhunt` database

# 3. Configure env
cp .env.example .env
#   set DATABASE_URL / DIRECT_URL and generate AUTH_SECRET:
#   openssl rand -base64 32

# 4. Migrate + seed
npm run prisma:deploy    # or: npm run prisma:migrate
npm run db:seed

# 5. Run
npm run dev              # http://localhost:3000
```

Seeded logins (dev only): `admin@jobhunt.test` / `demo@jobhunt.test`, password `password123`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` / `npm run typecheck` | ESLint / `tsc --noEmit` |
| `npm test` | Vitest unit + integration |
| `npm run test:e2e` | Playwright end-to-end |
| `npm run prisma:migrate` | Create + apply a dev migration |
| `npm run db:seed` | Seed skills, job sources and demo users |
| `npm run db:reset` | Drop, re-migrate and re-seed |

## Docker

```bash
cp .env.example .env      # set AUTH_SECRET at minimum
docker compose up --build
```

The `app` service runs `prisma migrate deploy` on start, then serves on `:3000`.

## Environment variables

See [`.env.example`](./.env.example) — every variable is documented there. Only
`DATABASE_URL` and `AUTH_SECRET` are required to boot; everything else defaults to
mock/local/console.

## Project layout

```
prisma/            schema, migrations, seed
src/app/           routes: (marketing) (auth) (dashboard) admin api
src/components/    ui/ (shadcn) + shared components
src/features/      feature modules (auth, jobs, matching, decision, …)
src/lib/           provider abstractions + infra (ai, jobs, auth, storage, …)
src/services/      cross-cutting orchestration (matching, ingestion, billing, …)
tests/             unit / integration / e2e
```
