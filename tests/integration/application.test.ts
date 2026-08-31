import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { testDb, resetDb, disconnectDb } from "../helpers/db";
import {
  createApplication,
  moveApplication,
  reorderApplications,
  getBoard,
  getApplicationStats,
  deleteApplication,
  addApplicationNote,
} from "@/services/application.service";

let userId: string;
let otherId: string;

beforeAll(async () => {
  await resetDb();
});
afterAll(async () => {
  await resetDb();
  await disconnectDb();
});
beforeEach(async () => {
  await testDb.user.deleteMany();
  const u = await testDb.user.create({ data: { email: "app@example.com" } });
  const o = await testDb.user.create({ data: { email: "app-other@example.com" } });
  userId = u.id;
  otherId = o.id;
});

describe("application service", () => {
  it("creates an application with an initial event and board order", async () => {
    const a = await createApplication(userId, { company: "Acme", title: "SRE" });
    expect(a?.status).toBe("SAVED");
    expect(a?.boardOrder).toBe(0);
    const events = await testDb.applicationEvent.findMany({ where: { applicationId: a!.id } });
    expect(events).toHaveLength(1);
    expect(events[0].toStatus).toBe("SAVED");

    const b = await createApplication(userId, { company: "Globex", title: "DevOps" });
    expect(b?.boardOrder).toBe(1);
  });

  it("records an event and stamps appliedAt when moving to APPLIED", async () => {
    const a = await createApplication(userId, { company: "Acme", title: "SRE" });
    const moved = await moveApplication(userId, a!.id, "APPLIED");
    expect(moved?.status).toBe("APPLIED");
    expect(moved?.appliedAt).not.toBeNull();

    const events = await testDb.applicationEvent.findMany({
      where: { applicationId: a!.id },
      orderBy: { createdAt: "asc" },
    });
    expect(events.map((e) => e.toStatus)).toEqual(["SAVED", "APPLIED"]);
    expect(events[1].fromStatus).toBe("SAVED");
  });

  it("keeps the original appliedAt when moving back and forth", async () => {
    const a = await createApplication(userId, { company: "Acme", title: "SRE" });
    const first = await moveApplication(userId, a!.id, "APPLIED");
    await moveApplication(userId, a!.id, "SCREENING");
    const back = await moveApplication(userId, a!.id, "APPLIED");
    expect(back?.appliedAt?.getTime()).toBe(first?.appliedAt?.getTime());
  });

  it("reorders cards within a column", async () => {
    const a = await createApplication(userId, { company: "A", title: "x" });
    const b = await createApplication(userId, { company: "B", title: "y" });
    const c = await createApplication(userId, { company: "C", title: "z" });
    await reorderApplications(userId, "SAVED", [c!.id, a!.id, b!.id]);
    const board = await getBoard(userId);
    expect(board.map((x) => x.company)).toEqual(["C", "A", "B"]);
  });

  it("won't let another user move or delete an application", async () => {
    const a = await createApplication(userId, { company: "Acme", title: "SRE" });
    await expect(moveApplication(otherId, a!.id, "APPLIED")).rejects.toThrow(/not found/i);
    await expect(deleteApplication(otherId, a!.id)).rejects.toThrow(/not found/i);
    await expect(addApplicationNote(otherId, a!.id, "hi")).rejects.toThrow(/not found/i);
  });

  it("computes stats from the event history", async () => {
    const a = await createApplication(userId, { company: "A", title: "x" });
    const b = await createApplication(userId, { company: "B", title: "y" });
    await moveApplication(userId, a!.id, "APPLIED");
    await moveApplication(userId, a!.id, "SCREENING");
    await moveApplication(userId, b!.id, "APPLIED");

    const stats = await getApplicationStats(userId);
    expect(stats.total).toBe(2);
    expect(stats.applied).toBe(2);
    expect(stats.responseRate).toBe(50); // a responded, b did not
  });

  it("does not double-track the same job", async () => {
    const source = await testDb.jobSource.upsert({
      where: { key: "t" },
      update: {},
      create: { key: "t", name: "t" },
    });
    const job = await testDb.job.create({
      data: {
        sourceId: source.id,
        externalId: "app-dup",
        title: "SRE",
        company: "Acme",
        country: "US",
        description: "d",
        url: "u",
        fingerprint: "fp-app-dup",
        sponsorshipAvailable: "UNKNOWN",
      },
    });
    const a = await createApplication(userId, { jobId: job.id, company: "Acme", title: "SRE" });
    const b = await createApplication(userId, { jobId: job.id, company: "Acme", title: "SRE" });
    expect(a!.id).toBe(b!.id);
    await testDb.jobSource.deleteMany();
  });
});
