import { env } from "@/lib/env";
import { prisma } from "@/lib/db";

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number; // epoch ms when the window resets
}

export interface RateLimiter {
  limit(key: string, opts?: { limit?: number; windowSec?: number }): Promise<RateLimitResult>;
}

const DEFAULT_LIMIT = 10;
const DEFAULT_WINDOW = 60;

/** In-memory fixed-window limiter. Fine for a single instance / tests. */
class MemoryRateLimiter implements RateLimiter {
  private buckets = new Map<string, { count: number; reset: number }>();

  async limit(
    key: string,
    opts?: { limit?: number; windowSec?: number },
  ): Promise<RateLimitResult> {
    const limit = opts?.limit ?? DEFAULT_LIMIT;
    const windowMs = (opts?.windowSec ?? DEFAULT_WINDOW) * 1000;
    const now = Date.now();
    const b = this.buckets.get(key);
    if (!b || b.reset < now) {
      const reset = now + windowMs;
      this.buckets.set(key, { count: 1, reset });
      return { success: true, remaining: limit - 1, reset };
    }
    b.count++;
    return { success: b.count <= limit, remaining: Math.max(0, limit - b.count), reset: b.reset };
  }
}

/**
 * Postgres fixed-window limiter using an atomic upsert on a synthetic table row.
 * Uses the existing `ErrorLog`-style pattern via a dedicated raw table created in
 * a migration (`RateLimit`). Falls back to memory if the table is missing.
 */
class PostgresRateLimiter implements RateLimiter {
  private fallback = new MemoryRateLimiter();

  async limit(
    key: string,
    opts?: { limit?: number; windowSec?: number },
  ): Promise<RateLimitResult> {
    const limit = opts?.limit ?? DEFAULT_LIMIT;
    const windowSec = opts?.windowSec ?? DEFAULT_WINDOW;
    const bucket = Math.floor(Date.now() / 1000 / windowSec);
    const compositeKey = `${key}:${bucket}`;
    const reset = (bucket + 1) * windowSec * 1000;
    try {
      const rows = await prisma.$queryRaw<{ count: number }[]>`
        INSERT INTO "RateLimit" ("key", "count", "expiresAt")
        VALUES (${compositeKey}, 1, to_timestamp(${reset / 1000}))
        ON CONFLICT ("key") DO UPDATE SET "count" = "RateLimit"."count" + 1
        RETURNING "count"
      `;
      const count = Number(rows[0]?.count ?? 1);
      return { success: count <= limit, remaining: Math.max(0, limit - count), reset };
    } catch {
      return this.fallback.limit(key, opts);
    }
  }
}

class UpstashRateLimiter implements RateLimiter {
  private fallback = new MemoryRateLimiter();
  constructor(
    private url: string,
    private token: string,
  ) {}

  async limit(
    key: string,
    opts?: { limit?: number; windowSec?: number },
  ): Promise<RateLimitResult> {
    const limit = opts?.limit ?? DEFAULT_LIMIT;
    const windowSec = opts?.windowSec ?? DEFAULT_WINDOW;
    const bucket = Math.floor(Date.now() / 1000 / windowSec);
    const redisKey = `rl:${key}:${bucket}`;
    const reset = (bucket + 1) * windowSec * 1000;
    try {
      const res = await fetch(`${this.url}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
        body: JSON.stringify([
          ["INCR", redisKey],
          ["EXPIRE", redisKey, windowSec],
        ]),
      });
      const data = (await res.json()) as { result: number }[];
      const count = Number(data[0]?.result ?? 1);
      return { success: count <= limit, remaining: Math.max(0, limit - count), reset };
    } catch {
      return this.fallback.limit(key, opts);
    }
  }
}

let cached: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (cached) return cached;
  if (
    env.RATELIMIT_DRIVER === "redis" &&
    env.UPSTASH_REDIS_REST_URL &&
    env.UPSTASH_REDIS_REST_TOKEN
  ) {
    cached = new UpstashRateLimiter(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN);
  } else if (env.RATELIMIT_DRIVER === "postgres") {
    cached = new PostgresRateLimiter();
  } else {
    cached = new MemoryRateLimiter();
  }
  return cached;
}

/** Convenience: throws a typed error when the limit is exceeded. */
export class RateLimitError extends Error {
  constructor(public reset: number) {
    super("Too many requests");
    this.name = "RateLimitError";
  }
}

export async function enforceRateLimit(
  key: string,
  opts?: { limit?: number; windowSec?: number },
): Promise<void> {
  const res = await getRateLimiter().limit(key, opts);
  if (!res.success) throw new RateLimitError(res.reset);
}
