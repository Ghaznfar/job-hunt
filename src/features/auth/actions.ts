"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import {
  createEmailVerificationToken,
  consumeEmailVerificationToken,
  createPasswordResetToken,
  consumePasswordResetToken,
} from "@/lib/auth/tokens";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/mail";
import { enforceRateLimit } from "@/lib/ratelimit";
import { absoluteUrl } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { ActionResult, ok, fail, parseInput, runAction } from "@/lib/action";
import { signUpSchema, forgotPasswordSchema, resetPasswordSchema } from "./schema";

export async function clientKey(scope: string): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  return `${scope}:${ip}`;
}

export async function signUpAction(input: FormData | unknown): Promise<ActionResult<{ email: string }>> {
  return runAction("auth.signUp", async () => {
    const parsed = parseInput(signUpSchema, input);
    if (!parsed.ok) return parsed.result;
    await enforceRateLimit(await clientKey("signup"), { limit: 5, windowSec: 600 });

    const { name, email, password } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      // Do not reveal that the account exists.
      return ok({ email });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        hashedPassword: await hashPassword(password),
        profile: { create: {} },
        subscription: { create: {} },
      },
    });
    logger.info({ userId: user.id }, "user signed up");

    const token = await createEmailVerificationToken(email);
    await sendVerificationEmail(
      email,
      absoluteUrl(`/verify-email?token=${token}&email=${encodeURIComponent(email)}`),
    );
    return ok({ email });
  });
}

export async function resendVerificationAction(email: string): Promise<ActionResult> {
  return runAction("auth.resendVerification", async () => {
    await enforceRateLimit(await clientKey("resend-verify"), { limit: 3, windowSec: 600 });
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { emailVerified: true },
    });
    if (user && !user.emailVerified) {
      const token = await createEmailVerificationToken(email.toLowerCase());
      await sendVerificationEmail(
        email.toLowerCase(),
        absoluteUrl(`/verify-email?token=${token}&email=${encodeURIComponent(email.toLowerCase())}`),
      );
    }
    return ok(undefined);
  });
}

export async function verifyEmailAction(
  email: string,
  token: string,
): Promise<ActionResult> {
  return runAction("auth.verifyEmail", async () => {
    const success = await consumeEmailVerificationToken(email.toLowerCase(), token);
    return success ? ok(undefined) : fail("This verification link is invalid or has expired.");
  });
}

export async function requestPasswordResetAction(
  input: FormData | unknown,
): Promise<ActionResult> {
  return runAction("auth.requestPasswordReset", async () => {
    const parsed = parseInput(forgotPasswordSchema, input);
    if (!parsed.ok) return parsed.result;
    await enforceRateLimit(await clientKey("forgot-pw"), { limit: 5, windowSec: 600 });

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true, hashedPassword: true },
    });
    if (user?.hashedPassword) {
      const token = await createPasswordResetToken(user.id);
      await sendPasswordResetEmail(parsed.data.email, absoluteUrl(`/reset-password?token=${token}`));
    }
    // Always report success.
    return ok(undefined);
  });
}

export async function resetPasswordAction(input: FormData | unknown): Promise<ActionResult> {
  return runAction("auth.resetPassword", async () => {
    const parsed = parseInput(resetPasswordSchema, input);
    if (!parsed.ok) return parsed.result;
    await enforceRateLimit(await clientKey("reset-pw"), { limit: 5, windowSec: 600 });

    const userId = await consumePasswordResetToken(parsed.data.token);
    if (!userId) return fail("This reset link is invalid or has expired.");

    await prisma.user.update({
      where: { id: userId },
      data: { hashedPassword: await hashPassword(parsed.data.password), emailVerified: new Date() },
    });
    logger.info({ userId }, "password reset");
    return ok(undefined);
  });
}
