"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { enforceRateLimit } from "@/lib/ratelimit";
import { ActionResult, ok, fail, parseInput } from "@/lib/action";
import { loginSchema } from "./schema";
import { clientKey } from "./actions";

function safeNext(raw: unknown): string {
  const s = String(raw ?? "");
  return s.startsWith("/") && !s.startsWith("//") ? s : "/dashboard";
}

export async function loginAction(
  input: FormData | unknown,
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = parseInput(loginSchema, input);
  if (!parsed.ok) return parsed.result;

  const redirectTo = safeNext(
    input instanceof FormData ? input.get("next") : (input as Record<string, unknown>)?.next,
  );

  try {
    await enforceRateLimit(await clientKey("login"), { limit: 10, windowSec: 300 });
    await signIn("credentials", { ...parsed.data, redirect: false });
  } catch (err) {
    if (err instanceof AuthError) {
      const cause = (err.cause as { err?: Error } | undefined)?.err?.message;
      if (cause === "EMAIL_NOT_VERIFIED" || err.message.includes("EMAIL_NOT_VERIFIED")) {
        return fail("Please verify your email before signing in. Check your inbox for the link.");
      }
      return fail("Incorrect email or password.");
    }
    if (err instanceof Error && err.message.includes("Too many requests")) {
      return fail("Too many attempts. Please wait a minute and try again.");
    }
    throw err;
  }
  return ok({ redirectTo });
}
