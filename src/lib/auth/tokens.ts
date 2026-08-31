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
  const record = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier: email, token: hashToken(token) } },
  });
  if (!record || record.expires < new Date()) return false;
  await prisma.$transaction([
    prisma.user.update({ where: { email }, data: { emailVerified: new Date() } }),
    prisma.verificationToken.deleteMany({ where: { identifier: email } }),
  ]);
  return true;
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
