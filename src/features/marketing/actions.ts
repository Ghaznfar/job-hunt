"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/db";
import { enforceRateLimit } from "@/lib/ratelimit";
import { ActionResult, ok, parseInput, runAction } from "@/lib/action";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  message: z.string().trim().min(10, "Tell us a little more").max(4000),
  // Honeypot — real users leave this empty.
  company: z.string().max(0).optional().or(z.literal("")),
});

export async function submitContactAction(input: FormData | unknown): Promise<ActionResult> {
  return runAction("marketing.contact", async () => {
    const parsed = parseInput(contactSchema, input);
    if (!parsed.ok) return parsed.result;

    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    await enforceRateLimit(`contact:${ip}`, { limit: 3, windowSec: 600 });

    if (parsed.data.company) {
      // Honeypot tripped — pretend success.
      return ok(undefined);
    }

    await prisma.errorLog.create({
      data: {
        level: "INFO",
        source: "contact",
        message: `Contact from ${parsed.data.name} <${parsed.data.email}>`,
        context: { message: parsed.data.message.slice(0, 4000) },
      },
    });
    logger.info({ email: parsed.data.email }, "contact form submission");
    return ok(undefined);
  });
}
