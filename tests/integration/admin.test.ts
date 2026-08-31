import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: () => authMock() }));

import { testDb, resetDb, disconnectDb } from "../helpers/db";
import {
  getAdminMetrics,
  listUsers,
  setUserRole,
  setUserDisabled,
} from "@/services/admin.service";
import { requireAdmin, getCurrentUser } from "@/lib/auth/guards";

let adminId: string;
let userId: string;

beforeAll(async () => {
  await resetDb();
});
afterAll(async () => {
  await resetDb();
  await disconnectDb();
});
beforeEach(async () => {
  await testDb.user.deleteMany();
  const a = await testDb.user.create({ data: { email: "admin@example.com", role: "ADMIN" } });
  const u = await testDb.user.create({ data: { email: "user@example.com", role: "USER" } });
  adminId = a.id;
  userId = u.id;
  authMock.mockReset();
});

describe("admin authz (guards)", () => {
  it("requireAdmin redirects a non-admin", async () => {
    authMock.mockResolvedValue({ user: { id: userId, email: "user@example.com", role: "USER" } });
    // next/navigation redirect throws NEXT_REDIRECT
    await expect(requireAdmin()).rejects.toThrow(/NEXT_REDIRECT/);
  });

  it("requireAdmin redirects an anonymous visitor", async () => {
    authMock.mockResolvedValue(null);
    await expect(requireAdmin()).rejects.toThrow(/NEXT_REDIRECT/);
  });

  it("requireAdmin returns the user when they are an admin", async () => {
    authMock.mockResolvedValue({ user: { id: adminId, email: "admin@example.com", role: "ADMIN" } });
    const u = await requireAdmin();
    expect(u.role).toBe("ADMIN");
  });

  it("getCurrentUser returns null when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    expect(await getCurrentUser()).toBeNull();
  });
});

describe("admin user management", () => {
  it("promotes and demotes users, writing an audit log", async () => {
    await setUserRole(adminId, userId, "ADMIN");
    expect((await testDb.user.findUnique({ where: { id: userId } }))?.role).toBe("ADMIN");
    const log = await testDb.auditLog.findFirst({ where: { action: "user.setRole", target: userId } });
    expect(log?.actorId).toBe(adminId);

    await setUserRole(adminId, userId, "USER");
    expect((await testDb.user.findUnique({ where: { id: userId } }))?.role).toBe("USER");
  });

  it("refuses to let an admin remove their own admin role or disable themselves", async () => {
    await expect(setUserRole(adminId, adminId, "USER")).rejects.toThrow(/your own/i);
    await expect(setUserDisabled(adminId, adminId, true)).rejects.toThrow(/your own/i);
  });

  it("disables and re-enables a user", async () => {
    await setUserDisabled(adminId, userId, true);
    expect((await testDb.user.findUnique({ where: { id: userId } }))?.disabledAt).not.toBeNull();
    await setUserDisabled(adminId, userId, false);
    expect((await testDb.user.findUnique({ where: { id: userId } }))?.disabledAt).toBeNull();
  });
});

describe("admin metrics", () => {
  it("returns a well-formed metrics object", async () => {
    await testDb.subscription.create({ data: { userId, plan: "PRO", status: "ACTIVE" } });
    const m = await getAdminMetrics();
    expect(m.users.total).toBeGreaterThanOrEqual(2);
    expect(m.users.pro).toBe(1);
    expect(m.users.free).toBe(m.users.total - 1);
    expect(typeof m.ai.costUsd30d).toBe("string");
    expect(m).toHaveProperty("jobs.total");
  });

  it("listUsers filters by query", async () => {
    const found = await listUsers("admin@");
    expect(found.every((u) => u.email.includes("admin@"))).toBe(true);
  });
});
