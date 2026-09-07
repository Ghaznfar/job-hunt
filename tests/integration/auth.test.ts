import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

// --- Mock Next.js request-scoped APIs used by server actions -------------------
vi.mock("next/headers", () => ({
  headers: async () => new Map<string, string>([["x-forwarded-for", "127.0.0.1"]]),
  cookies: async () => new Map(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("@/auth", () => ({
  signIn: vi.fn(async () => undefined),
  signOut: vi.fn(async () => undefined),
  auth: vi.fn(async () => null),
}));

import { testDb, resetDb, disconnectDb } from "../helpers/db";
import { signUpAction, verifyEmailAction, resetPasswordAction } from "@/features/auth/actions";
import { verifyPassword } from "@/lib/auth/password";
import {
  createPasswordResetToken,
  createEmailVerificationToken,
  consumeEmailVerificationToken,
} from "@/lib/auth/tokens";

beforeAll(async () => {
  await resetDb();
});
afterAll(async () => {
  await resetDb();
  await disconnectDb();
});
beforeEach(async () => {
  await resetDb();
});

describe("sign up", () => {
  it("creates an unverified user with a profile and subscription", async () => {
    const res = await signUpAction({
      name: "Test User",
      email: "new@example.com",
      password: "abcd1234",
    });
    expect(res.ok).toBe(true);

    const user = await testDb.user.findUnique({
      where: { email: "new@example.com" },
      include: { profile: true, subscription: true },
    });
    expect(user).toBeTruthy();
    expect(user?.emailVerified).toBeNull();
    expect(user?.hashedPassword).toBeTruthy();
    expect(user?.hashedPassword).not.toBe("abcd1234");
    expect(user?.profile).toBeTruthy();
    expect(user?.subscription?.plan).toBe("FREE");
  });

  it("does not leak that an account already exists", async () => {
    await testDb.user.create({ data: { email: "dupe@example.com", hashedPassword: "x" } });
    const res = await signUpAction({
      name: "Dupe",
      email: "dupe@example.com",
      password: "abcd1234",
    });
    expect(res.ok).toBe(true);
    // Still exactly one row, original hash unchanged.
    const rows = await testDb.user.findMany({ where: { email: "dupe@example.com" } });
    expect(rows).toHaveLength(1);
    expect(rows[0].hashedPassword).toBe("x");
  });

  it("rejects a weak password with field errors", async () => {
    const res = await signUpAction({ name: "Weak", email: "weak@example.com", password: "short" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.fieldErrors?.password?.length).toBeGreaterThan(0);
  });

  it("creates a verification token that verifies the email", async () => {
    await signUpAction({ name: "V", email: "verify@example.com", password: "abcd1234" });
    const token = await testDb.verificationToken.findFirst({
      where: { identifier: "verify@example.com" },
    });
    expect(token).toBeTruthy();

    const bad = await verifyEmailAction("verify@example.com", "deadbeef");
    expect(bad.ok).toBe(false);
    const stillUnverified = await testDb.user.findUnique({
      where: { email: "verify@example.com" },
    });
    expect(stillUnverified?.emailVerified).toBeNull();
  });

  it("verifies with the raw token even if the email query param is wrong/mangled", async () => {
    await testDb.user.create({ data: { email: "roundtrip@example.com", hashedPassword: "x" } });
    const raw = await createEmailVerificationToken("roundtrip@example.com");

    // Mail clients can alter the `email` param — verification must still work off the token alone.
    const ok = await consumeEmailVerificationToken("WRONG+garbled@example.com", raw);
    expect(ok).toBe(true);
    const user = await testDb.user.findUnique({ where: { email: "roundtrip@example.com" } });
    expect(user?.emailVerified).not.toBeNull();

    // Row is single-use; a re-click still resolves true via the already-verified path.
    expect(
      await testDb.verificationToken.findMany({ where: { identifier: "roundtrip@example.com" } }),
    ).toHaveLength(0);
    expect(await consumeEmailVerificationToken("roundtrip@example.com", raw)).toBe(true);
  });

  it("fails for an unknown token on an unverified account", async () => {
    await testDb.user.create({ data: { email: "nope@example.com", hashedPassword: "x" } });
    expect(await consumeEmailVerificationToken("nope@example.com", "not-a-real-token")).toBe(false);
  });

  it("treats an already-verified account as success (link prefetch / double click)", async () => {
    await testDb.user.create({
      data: { email: "prefetch@example.com", hashedPassword: "x", emailVerified: new Date() },
    });
    // token was already consumed by a scanner; user clicks the dead link
    expect(await consumeEmailVerificationToken("prefetch@example.com", "anything")).toBe(true);
  });
});

describe("password reset", () => {
  it("resets the password with a valid token and verifies the email", async () => {
    const user = await testDb.user.create({
      data: { email: "reset@example.com", hashedPassword: "old-hash" },
    });
    const token = await createPasswordResetToken(user.id);

    const res = await resetPasswordAction({
      token,
      password: "newpass123",
      confirm: "newpass123",
    });
    expect(res.ok).toBe(true);

    const updated = await testDb.user.findUnique({ where: { id: user.id } });
    expect(updated?.emailVerified).not.toBeNull();
    expect(await verifyPassword("newpass123", updated!.hashedPassword!)).toBe(true);

    // Token is single-use.
    const reuse = await resetPasswordAction({
      token,
      password: "another123",
      confirm: "another123",
    });
    expect(reuse.ok).toBe(false);
  });

  it("rejects a mismatched confirmation", async () => {
    const user = await testDb.user.create({
      data: { email: "reset2@example.com", hashedPassword: "old" },
    });
    const token = await createPasswordResetToken(user.id);
    const res = await resetPasswordAction({ token, password: "newpass123", confirm: "different1" });
    expect(res.ok).toBe(false);
  });
});
