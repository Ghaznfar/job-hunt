import { enforceRateLimit } from "@/lib/ratelimit";

/**
 * Per-user rate guard for expensive/AI actions. Two windows:
 *  - a short burst window (default 8 / 20s)
 *  - a sustained window (default 40 / 10min)
 */
export async function guardUserRate(
  userId: string,
  scope: string,
  opts?: { burst?: number; burstSec?: number; sustained?: number; sustainedSec?: number },
): Promise<void> {
  await enforceRateLimit(`${scope}:burst:${userId}`, {
    limit: opts?.burst ?? 8,
    windowSec: opts?.burstSec ?? 20,
  });
  await enforceRateLimit(`${scope}:sustained:${userId}`, {
    limit: opts?.sustained ?? 40,
    windowSec: opts?.sustainedSec ?? 600,
  });
}
