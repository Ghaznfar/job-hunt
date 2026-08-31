"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startCheckoutAction, openBillingPortalAction } from "@/features/billing/actions";

export function UpgradeButton({ devBypass }: { devBypass: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await startCheckoutAction();
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          if (res.data.url) {
            window.location.href = res.data.url;
          } else {
            toast.success(devBypass ? "Pro activated (dev mode)" : "Upgraded");
            router.refresh();
          }
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {devBypass ? "Activate Pro (dev)" : "Upgrade to Pro — $9.99/mo"}
    </Button>
  );
}

export function ManageBillingButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await openBillingPortalAction();
          if (res.ok) window.location.href = res.data.url;
          else toast.error(res.error);
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Manage billing
    </Button>
  );
}
