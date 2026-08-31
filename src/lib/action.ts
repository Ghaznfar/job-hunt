import { z } from "zod";
import { logger } from "@/lib/logger";
import { RateLimitError } from "@/lib/ratelimit";

/** Discriminated result returned by every server action. */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

/** Parse `FormData` or a plain object with a Zod schema into an ActionResult. */
export function parseInput<S extends z.ZodTypeAny>(
  schema: S,
  input: unknown,
): { ok: true; data: z.infer<S> } | { ok: false; result: ActionResult<never> } {
  const raw =
    input instanceof FormData ? Object.fromEntries(input.entries()) : (input as Record<string, unknown>);
  const parsed = schema.safeParse(raw);
  if (parsed.success) return { ok: true, data: parsed.data };
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.join(".") || "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { ok: false, result: fail("Please correct the highlighted fields.", fieldErrors) };
}

/** Wrap an action body with uniform error handling + logging. */
export async function runAction<T>(
  name: string,
  fn: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof RateLimitError) {
      return fail("You're doing that too often. Please wait a moment and try again.");
    }
    // `redirect()` throws a special error that must propagate.
    if (err && typeof err === "object" && "digest" in err && String((err as { digest: string }).digest).startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    logger.error({ action: name, err: err instanceof Error ? err.message : String(err) }, "action failed");
    return fail("Something went wrong. Please try again.");
  }
}
