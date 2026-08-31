import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { handleStripeWebhook, isStripeConfigured } from "@/services/billing.service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isStripeConfigured) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 501 });
  }
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }
  const rawBody = await req.text();
  try {
    await handleStripeWebhook(rawBody, signature);
    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, "stripe webhook error");
    // 400 => Stripe will retry.
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 400 });
  }
}
