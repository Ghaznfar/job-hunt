import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { runIngestion } from "@/services/ingestion.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  if (!env.CRON_SECRET) return false;
  const header = req.headers.get("authorization");
  const url = new URL(req.url);
  return (
    header === `Bearer ${env.CRON_SECRET}` || url.searchParams.get("key") === env.CRON_SECRET
  );
}

async function handle(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const results = await runIngestion({ limitPerProvider: 150 });
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    logger.error({ err: String(err) }, "cron ingestion failed");
    return NextResponse.json({ ok: false, error: "Ingestion failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
