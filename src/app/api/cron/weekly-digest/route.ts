import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/server/env";
import { sendWeeklyDigests } from "@/server/services/weekly-digest";

/**
 * Weekly email, run by Vercel Cron (vercel.json). Vercel sends "Authorization: Bearer <CRON_SECRET>";
 * without CRON_SECRET set, or with the wrong one, the route does nothing.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!env.cronSecret || req.headers.get("authorization") !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not allowed." } }, { status: 401 });
  }
  const result = await sendWeeklyDigests();
  console.info("Weekly digest:", result);
  return NextResponse.json(result);
}
