import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeCode } from "@/server/auth/google";
import { createSession } from "@/server/auth/session";
import { env, googleEnabled } from "@/server/env";
import { route } from "@/server/http/handler";
import { upsertGoogleUser } from "@/server/services/auth";

const fail = (reason: string) => NextResponse.redirect(`${env.appUrl}/login?error=${reason}`);

export const GET = route({ auth: false, limit: "auth" }, async ({ req, ip }) => {
  if (!googleEnabled) return fail("google_unavailable");
  const jar = await cookies();
  const expected = jar.get("tv_oauth_state")?.value ?? "";
  jar.delete("tv_oauth_state");
  const state = req.nextUrl.searchParams.get("state") ?? "";
  const code = req.nextUrl.searchParams.get("code");
  // Reject forged callbacks (OAuth CSRF).
  if (!code || !expected || state.length !== expected.length || !timingSafeEqual(Buffer.from(state), Buffer.from(expected)))
    return fail("google_failed");
  try {
    const profile = await exchangeCode(code);
    const { user } = await upsertGoogleUser(profile);
    await createSession(user.id, { userAgent: req.headers.get("user-agent") ?? "", ip });
    return NextResponse.redirect(`${env.appUrl}${user.onboarded ? "/home" : "/onboarding"}`);
  } catch {
    return fail("google_failed");
  }
});
