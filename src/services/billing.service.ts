import "server-only";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { env, isStripeConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getStripe, PRO_PRICE_ID, PORTAL_RETURN_URL } from "@/lib/payments/stripe";
import type { SubscriptionStatus } from "@prisma/client";

export { isStripeConfigured };
export const isDevBillingBypass = !isStripeConfigured && env.NODE_ENV !== "production";

const STATUS_MAP: Record<string, SubscriptionStatus> = {
  active: "ACTIVE",
  trialing: "TRIALING",
  past_due: "PAST_DUE",
  canceled: "CANCELED",
  unpaid: "UNPAID",
  incomplete: "INCOMPLETE",
  incomplete_expired: "CANCELED",
  paused: "CANCELED",
};

export function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  return STATUS_MAP[stripeStatus] ?? "INCOMPLETE";
}

export const ACTIVE_STRIPE_STATUSES = ["active", "trialing", "past_due"];

/**
 * Idempotently persist subscription state. This is the single source of truth
 * for a user's plan — only ever called from verified webhooks (or the dev bypass).
 */
export async function applySubscriptionUpdate(
  userId: string,
  input: {
    stripeStatus: string;
    subscriptionId: string;
    customerId: string;
    priceId: string | null;
    periodEndUnix: number;
    cancelAtPeriodEnd: boolean;
  },
) {
  const isActive = ACTIVE_STRIPE_STATUSES.includes(input.stripeStatus);
  const plan = isActive ? "PRO" : "FREE";
  const data = {
    plan,
    status: mapStripeStatus(input.stripeStatus),
    stripeCustomerId: input.customerId,
    stripeSubscriptionId: input.subscriptionId,
    stripePriceId: input.priceId,
    currentPeriodEnd: new Date(input.periodEndUnix * 1000),
    cancelAtPeriodEnd: input.cancelAtPeriodEnd,
  } as const;
  await prisma.subscription.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
  return plan;
}

async function ensureCustomer(userId: string): Promise<string> {
  const [user, sub] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, name: true } }),
    prisma.subscription.findUnique({ where: { userId }, select: { stripeCustomerId: true } }),
  ]);
  if (sub?.stripeCustomerId) return sub.stripeCustomerId;

  const customer = await getStripe().customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: { userId },
  });
  await prisma.subscription.upsert({
    where: { userId },
    create: { userId, stripeCustomerId: customer.id },
    update: { stripeCustomerId: customer.id },
  });
  return customer.id;
}

/** Returns a Checkout URL, or performs the dev bypass and returns null. */
export async function startCheckout(userId: string, appUrl: string): Promise<string | null> {
  if (isDevBillingBypass) {
    await prisma.subscription.upsert({
      where: { userId },
      create: { userId, plan: "PRO", status: "ACTIVE" },
      update: { plan: "PRO", status: "ACTIVE" },
    });
    logger.warn({ userId }, "dev billing bypass: activated PRO without Stripe");
    return null;
  }
  if (!isStripeConfigured) throw new Error("Billing is not configured.");

  const customerId = await ensureCustomer(userId);
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: PRO_PRICE_ID, quantity: 1 }],
    success_url: `${appUrl}/dashboard/settings/billing?checkout=success`,
    cancel_url: `${appUrl}/dashboard/settings/billing?checkout=cancelled`,
    allow_promotion_codes: true,
    subscription_data: { metadata: { userId } },
    client_reference_id: userId,
  });
  return session.url;
}

export async function openBillingPortal(userId: string): Promise<string> {
  if (!isStripeConfigured) throw new Error("Billing is not configured.");
  const customerId = await ensureCustomer(userId);
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: PORTAL_RETURN_URL,
  });
  return session.url;
}

/** Persist subscription state from a Stripe Subscription object. */
async function syncSubscription(sub: Stripe.Subscription) {
  const userId =
    (sub.metadata?.userId as string | undefined) ??
    (await prisma.subscription
      .findFirst({ where: { stripeCustomerId: sub.customer as string }, select: { userId: true } })
      .then((r) => r?.userId));
  if (!userId) {
    logger.warn({ subscriptionId: sub.id }, "webhook: no userId for subscription");
    return;
  }

  const plan = await applySubscriptionUpdate(userId, {
    stripeStatus: sub.status,
    subscriptionId: sub.id,
    customerId: sub.customer as string,
    priceId: sub.items.data[0]?.price.id ?? null,
    periodEndUnix: sub.current_period_end,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  });
  logger.info({ userId, status: sub.status, plan }, "subscription synced");
}

/** Verify + dispatch a Stripe webhook. Throws on bad signature. */
export async function handleStripeWebhook(rawBody: string, signature: string): Promise<void> {
  if (!isStripeConfigured || !env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("Stripe webhook not configured.");
  }
  const event = getStripe().webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription) {
        const sub = await getStripe().subscriptions.retrieve(session.subscription as string);
        if (!sub.metadata?.userId && session.client_reference_id) {
          sub.metadata = { ...sub.metadata, userId: session.client_reference_id };
        }
        await syncSubscription(sub);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      logger.warn({ customer: invoice.customer }, "invoice payment failed");
      await prisma.errorLog.create({
        data: {
          level: "WARN",
          source: "billing",
          message: "Invoice payment failed",
          context: { customer: String(invoice.customer), invoice: invoice.id },
        },
      });
      break;
    }
    default:
      logger.debug({ type: event.type }, "unhandled stripe event");
  }
}

export async function getBillingOverview(userId: string) {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  return {
    plan: sub?.plan ?? "FREE",
    status: sub?.status ?? "ACTIVE",
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    stripeConfigured: isStripeConfigured,
    devBypass: isDevBillingBypass,
  };
}
