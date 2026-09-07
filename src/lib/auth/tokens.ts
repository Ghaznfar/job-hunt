import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/db";

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const RESET_TTL_MS = 60 * 60 * 1000; // 1h

function rawToken(): string {
  return randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// ---- Email verification (uses Auth.js VerificationToken table) ---------------

export async function createEmailVerificationToken(email: string): Promise<string> {
  const token = rawToken();
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: hashToken(token),
      expires: new Date(Date.now() + VERIFICATION_TTL_MS),
    },
  });
  return token;
}

export async function consumeEmailVerificationToken(
  email: string,
  token: string,
): Promise<boolean> {
  // Look the token up on its own (it's globally unique) rather than on
  // (identifier, token): the `email` query param in the link can be altered by
  // mail clients (link wrapping, casing, "+" handling), and the raw token —
  // 64 hex chars — always survives.
  const record = await prisma.verificationToken.findUnique({
    where: { token: hashToken(token) },
  });

  if (record && record.expires >= new Date()) {
    await prisma.$transaction([
      prisma.user.update({
        where: { email: record.identifier },
        data: { emailVerified: new Date() },
      }),
      prisma.verificationToken.deleteMany({ where: { identifier: record.identifier } }),
    ]);
    return true;
  }

  // Token missing or expired. If a link prefetcher/scanner already consumed it
  // (or the user clicked twice), the account may already be verified — treat as success.
  const target = (record?.identifier ?? email)?.trim().toLowerCase();
  if (target) {
    const user = await prisma.user.findUnique({
      where: { email: target },
      select: { emailVerified: true },
    });
    if (user?.emailVerified) return true;
  }
  return false;
}

// ---- Password reset --------------------------------------------------------

export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = rawToken();
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  await prisma.passwordResetToken.create({
    data: { userId, token: hashToken(token), expires: new Date(Date.now() + RESET_TTL_MS) },
  });
  return token;
}

export async function consumePasswordResetToken(token: string): Promise<string | null> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { token: hashToken(token) },
  });
  if (!record || record.expires < new Date()) return null;
  await prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } });
  return record.userId;
}
