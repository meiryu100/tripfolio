import { INDEXNOW_KEY } from "@/lib/indexnow";

/** The IndexNow key file, so engines can check our URL submissions (see src/lib/indexnow.ts). */

export const dynamic = "force-static";

export function GET() {
  return new Response(INDEXNOW_KEY, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
