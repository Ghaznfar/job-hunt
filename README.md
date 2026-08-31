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

## Production deployment

The image is a standard Next.js **standalone** build. Any container host works
(Fly.io, Railway, Render, ECS, Cloud Run, a plain VPS).

1. **Provision Postgres** and set `DATABASE_URL` / `DIRECT_URL`.
2. **Generate `AUTH_SECRET`**: `openssl rand -base64 32`. Set `AUTH_URL` to the
   public URL and `AUTH_TRUST_HOST=true`.
3. **Build & push the image**:
   ```bash
   docker build -t <registry>/jobhunt:<tag> .
   docker push <registry>/jobhunt:<tag>
   ```
4. **Run it.** The container entrypoint runs `prisma migrate deploy` then starts
   the server on `:3000`. Provide env vars from your platform's secret store —
   never bake them into the image.
5. **Seed once** (optional, for the skill catalogue + demo data):
   `docker run --rm -e DATABASE_URL=... <image> node_modules/.bin/tsx prisma/seed.ts`
   In production you typically only need the skill catalogue — run
   `prisma db seed` or a trimmed seed.
6. **Job ingestion**: schedule `GET /api/cron/ingest-jobs` with the `CRON_SECRET`
   (Vercel Cron, a platform scheduler, or a system cron hitting the URL) — e.g.
   every 6 hours.
7. **Stripe** (when going paid): create the Pro price, set `STRIPE_*` vars, and
   point a webhook endpoint at `/api/stripe/webhook` for
   `checkout.session.completed` and `customer.subscription.*`.
8. **Storage**: set `STORAGE_DRIVER=s3` with an S3-compatible bucket for CV files
   (the local driver is single-node only).

### `docker compose` (self-host all-in-one)

```bash
cp .env.example .env
# set AUTH_SECRET; optionally ANTHROPIC_API_KEY / ADZUNA_* / STRIPE_*
export AUTH_SECRET=$(openssl rand -base64 32)
docker compose up --build
```

Brings up Postgres + the app; the app runs migrations on start and serves on
`http://localhost:3000`.

## CI

`.github/workflows/ci.yml`: **verify** (prettier, lint, typecheck, migrations,
unit+integration tests, build) · **e2e** (Playwright against a seeded DB) ·
**security** (`npm audit`, Gitleaks) · **docker** (image build + Trivy scan).
No auto-deploy — wire your platform's deploy step after `docker` passes.
