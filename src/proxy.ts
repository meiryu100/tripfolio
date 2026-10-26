import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { ATTRIBUTION_COOKIE, ATTRIBUTION_MAX_AGE, attributionFrom, encodeAttribution } from "@/lib/attribution";
import { detectBot } from "@/lib/bots";
import { CONSENT_COOKIE } from "@/lib/consent";

/**
 * Route protection: visitors without a session cookie are sent to /login before
 * any app page renders. The cookie's validity is checked by the API; a stale
 * cookie is cleared by the app layout, so this never loops.
 *
 * The exception is a profile link (/u/<username>): signed-out visitors and link
 * previews get the public profile page instead, at the same URL.
 *
 * It also remembers where a signed-out visitor first came from (UTM tags or the
 * referring site), for sign-up attribution — see src/lib/attribution.ts. That cookie is optional, so it
 * is only set once the visitor chose "Accept all" in the cookie banner (tf_consent_v2=all, src/lib/consent.ts).
 *
 * Requests from known search-engine and AI crawlers (src/lib/bots.ts) are counted per page for
 * the admin SEO page, after the response is sent so they never slow a page down.
 */
const PROTECTED = ["/home", "/map", "/explore", "/trips", "/wishlist", "/friends", "/notifications", "/messages", "/profile", "/settings", "/u", "/onboarding", "/year"];

export function proxy(req: NextRequest, event: NextFetchEvent) {
  const hasSession = req.cookies.has("tv_session");
  const bot = hasSession ? null : detectBot(req.headers.get("user-agent"));
  if (bot && !req.nextUrl.pathname.startsWith("/admin")) {
    const path = req.nextUrl.pathname;
    event.waitUntil(import("@/server/services/bot-visits").then((m) => m.recordBotVisit(bot.name, path)));
  }
  const res = route(req, hasSession);
  if (!hasSession && req.cookies.get(CONSENT_COOKIE)?.value === "all" && !req.cookies.has(ATTRIBUTION_COOKIE)) {
    const a = attributionFrom(req.nextUrl, req.headers.get("referer"));
    if (a) res.cookies.set(ATTRIBUTION_COOKIE, encodeAttribution(a), { maxAge: ATTRIBUTION_MAX_AGE, httpOnly: true, sameSite: "lax", secure: req.nextUrl.protocol === "https:", path: "/" });
  }
  return res;
}

function route(req: NextRequest, hasSession: boolean) {
  const { pathname, search } = req.nextUrl;
  const profile = pathname.match(/^\/u\/([^/]+)\/?$/);
  if (profile && !hasSession) return NextResponse.rewrite(new URL(`/share/${profile[1]}${search}`, req.url));
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isProtected && !hasSession) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Pages (paths without a file extension), profile links (usernames may contain dots, e.g.
  // /u/jane.doe), and the crawler files we want to see bots fetch. Other files skip the proxy.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)", "/u/:path*", "/robots.txt", "/sitemap.xml", "/llms.txt", "/blog/rss.xml"],
};
