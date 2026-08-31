# syntax=docker/dockerfile:1

# ---- Base ----
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- Dependencies ----
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- Builder ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Dummy DATABASE_URL so `prisma generate` and the type-checked build succeed.
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=public"
ENV AUTH_SECRET="build-time-placeholder-secret-not-used-at-runtime"
RUN npx prisma generate && npm run build

# ---- Runner ----
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Full dependency tree first (needed for `prisma migrate deploy` at release time)…
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
# …then the standalone server bundle on top.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Apply migrations, then start the server.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node server.js"]
