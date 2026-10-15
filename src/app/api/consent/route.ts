import { NextResponse } from "next/server";
import { ATTRIBUTION_COOKIE, ATTRIBUTION_MAX_AGE, attributionFrom, encodeAttribution } from "@/lib/attribution";
import { CONSENT_COOKIE, CONSENT_MAX_AGE } from "@/lib/consent";
import { consentSchema } from "@/lib/validation";
import { env } from "@/server/env";
import { parseBody, route } from "@/server/http/handler";

/**
 * Saves the cookie banner choice. "all" also stores where the visitor first came from (the landing URL
 * and referrer the browser kept in memory) in `tf_src`; "essential" removes `tf_src` if it exists.
 */
export const POST = route({ auth: false }, async ({ req, session }) => {
  const { choice, landing, referrer } = await parseBody(req, consentSchema);
  const res = NextResponse.json({ choice }, { headers: { "Cache-Control": "private, no-store" } });
  const cookie = { sameSite: "lax", secure: env.isProd, path: "/" } as const;

  // Readable by the page (not httpOnly) so the banner knows whether to show.
  res.cookies.set(CONSENT_COOKIE, choice, { ...cookie, maxAge: CONSENT_MAX_AGE });

  if (choice === "essential") {
    res.cookies.delete(ATTRIBUTION_COOKIE);
  } else if (!session && landing && !req.cookies.has(ATTRIBUTION_COOKIE)) {
    let url: URL | null = null;
    try {
      url = new URL(landing);
    } catch {
      // Not a URL; nothing to remember.
    }
    const a = url && attributionFrom(url, referrer || null);
    if (a) res.cookies.set(ATTRIBUTION_COOKIE, encodeAttribution(a), { ...cookie, maxAge: ATTRIBUTION_MAX_AGE, httpOnly: true });
  }
  return res;
});
