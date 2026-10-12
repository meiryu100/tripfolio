import { NextResponse, type NextRequest } from "next/server";

/**
 * Route protection: visitors without a session cookie are sent to /login before
 * any app page renders. The cookie's validity is checked by the API; a stale
 * cookie is cleared by the app layout, so this never loops.
 *
 * The exception is a profile link (/u/<username>): signed-out visitors and link
 * previews get the public profile page instead, at the same URL.
 */
const PROTECTED = ["/home", "/map", "/explore", "/trips", "/wishlist", "/friends", "/notifications", "/profile", "/settings", "/u", "/onboarding"];

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = req.cookies.has("tv_session");
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
