import { NextResponse, type NextRequest } from "next/server";

/**
 * Route protection: visitors without a session cookie are sent to /login before
 * any app page renders. The cookie's validity is checked by the API; a stale
 * cookie is cleared by the app layout, so this never loops.
 */
const PROTECTED = ["/home", "/map", "/explore", "/trips", "/wishlist", "/friends", "/notifications", "/profile", "/settings", "/u", "/onboarding"];

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = req.cookies.has("tv_session");
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
