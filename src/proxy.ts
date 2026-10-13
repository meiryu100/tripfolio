import { NextResponse, type NextRequest } from "next/server";
import { ATTRIBUTION_COOKIE, ATTRIBUTION_MAX_AGE, attributionFrom, encodeAttribution } from "@/lib/attribution";

/**
 * Route protection: visitors without a session cookie are sent to /login before
 * any app page renders. The cookie's validity is checked by the API; a stale
 * cookie is cleared by the app layout, so this never loops.
 *
 * The exception is a profile link (/u/<username>): signed-out visitors and link
 * previews get the public profile page instead, at the same URL.
 *
 * It also remembers where a signed-out visitor first came from (UTM tags or the
 * referring site), for sign-up attribution — see src/lib/attribution.ts.
 */
const PROTECTED = ["/home", "/map", "/explore", "/trips", "/wishlist", "/friends", "/notifications", "/messages", "/profile", "/settings", "/u", "/onboarding"];

export function proxy(req: NextRequest) {
  const hasSession = req.cookies.has("tv_session");
  const res = route(req, hasSession);
  if (!hasSession && !req.cookies.has(ATTRIBUTION_COOKIE)) {
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
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
