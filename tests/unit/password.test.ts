import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  passwordSchema,
  passwordStrength,
} from "@/lib/auth/password";

describe("password hashing", () => {
  it("hashes and verifies a correct password", async () => {
    const hash = await hashPassword("s3cretpassword");
    expect(hash).not.toBe("s3cretpassword");
    expect(await verifyPassword("s3cretpassword", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("s3cretpassword");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("returns false for an empty hash", async () => {
    expect(await verifyPassword("anything", "")).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("accepts a valid password", () => {
    expect(passwordSchema.safeParse("abcd1234").success).toBe(true);
  });
  it("rejects short passwords", () => {
    expect(passwordSchema.safeParse("ab12").success).toBe(false);
  });
  it("rejects passwords without a number", () => {
    expect(passwordSchema.safeParse("abcdefgh").success).toBe(false);
  });
  it("rejects passwords without a letter", () => {
    expect(passwordSchema.safeParse("12345678").success).toBe(false);
  });
});

describe("passwordStrength", () => {
  it("scores a weak password low", () => {
    expect(passwordStrength("abc12345").score).toBeLessThanOrEqual(2);
  });
  it("scores a strong password high", () => {
    expect(passwordStrength("Abcdef1!ghij").score).toBeGreaterThanOrEqual(3);
  });
});
