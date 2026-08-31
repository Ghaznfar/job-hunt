import Stripe from "stripe";
import { env, isStripeConfigured } from "@/lib/env";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured (STRIPE_SECRET_KEY missing).");
  }
  client ??= new Stripe(env.STRIPE_SECRET_KEY, {
    // Pin to the account default by omitting apiVersion; keeps us off a
    // hard-coded version the installed SDK types may not know about.
    typescript: true,
    appInfo: { name: "JobHunt" },
  });
  return client;
}

export { isStripeConfigured };

export const PRO_PRICE_ID = env.STRIPE_PRO_PRICE_ID;
export const PORTAL_RETURN_URL = env.STRIPE_PORTAL_RETURN_URL;
