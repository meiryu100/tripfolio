import { NextResponse } from "next/server";
import { exchangeCode } from "@/server/auth/google";
import { completeOAuth } from "@/server/auth/oauth";
import { createSession } from "@/server/auth/session";
import { env, googleEnabled } from "@/server/env";
import { route } from "@/server/http/handler";
import { upsertGoogleUser } from "@/server/services/auth";
import { appHomeFor } from "@/lib/app-home";

const fail = (reason: string) => NextResponse.redirect(`${env.appUrl}/login?error=${reason}`);

export const GET = route({ auth: false, limit: "auth" }, async ({ req, ip }) => {
  if (!googleEnabled) return fail("google_unavailable");
  const oauth = await completeOAuth("google", req);
  if (!oauth) return fail("google_failed");
  try {
    const profile = await exchangeCode(oauth.code);
    const { user } = await upsertGoogleUser(profile, oauth.ref);
    await createSession(user.id, { userAgent: req.headers.get("user-agent") ?? "", ip });
    return NextResponse.redirect(`${env.appUrl}${user.onboarded ? appHomeFor(req.headers.get("user-agent")) : "/onboarding"}`);
  } catch {
    return fail("google_failed");
  }
});
