"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guards";
import { env } from "@/lib/env";
import { ActionResult, ok, fail, runAction } from "@/lib/action";
import { startCheckout, openBillingPortal } from "@/services/billing.service";

export async function startCheckoutAction(): Promise<ActionResult<{ url: string | null }>> {
  return runAction("billing.checkout", async () => {
    const user = await requireUser();
    const url = await startCheckout(user.id, env.APP_URL);
    revalidatePath("/dashboard/settings/billing");
    revalidatePath("/dashboard");
    return ok({ url });
  });
}

export async function openBillingPortalAction(): Promise<ActionResult<{ url: string }>> {
  return runAction("billing.portal", async () => {
    const user = await requireUser();
    try {
      const url = await openBillingPortal(user.id);
      return ok({ url });
    } catch {
      return fail("Billing portal is unavailable until Stripe is configured.");
    }
  });
}
