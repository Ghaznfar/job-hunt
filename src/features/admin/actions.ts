"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { ActionResult, ok, runAction } from "@/lib/action";
import { setUserRole, setUserDisabled } from "@/services/admin.service";
import { runIngestion } from "@/services/ingestion.service";

export async function setUserRoleAction(
  userId: string,
  role: "USER" | "ADMIN",
): Promise<ActionResult> {
  return runAction("admin.setRole", async () => {
    const admin = await requireAdmin();
    await setUserRole(admin.id, userId, role);
    revalidatePath("/admin/users");
    return ok(undefined);
  });
}

export async function setUserDisabledAction(
  userId: string,
  disabled: boolean,
): Promise<ActionResult> {
  return runAction("admin.setDisabled", async () => {
    const admin = await requireAdmin();
    await setUserDisabled(admin.id, userId, disabled);
    revalidatePath("/admin/users");
    return ok(undefined);
  });
}

export async function adminRunIngestionAction(): Promise<ActionResult<{ summary: string }>> {
  return runAction("admin.ingest", async () => {
    await requireAdmin();
    const results = await runIngestion({ limitPerProvider: 200 });
    const summary = results
      .map((r) => `${r.provider}: +${r.created} / ~${r.updated} / dup ${r.duplicates}`)
      .join(" · ");
    revalidatePath("/admin/jobs");
    return ok({ summary });
  });
}
