import { NextResponse } from "next/server";
import { exchangeCode } from "@/server/auth/facebook";
import { completeOAuth } from "@/server/auth/oauth";
import { createSession } from "@/server/auth/session";
import { env, facebookEnabled } from "@/server/env";
import { HttpError } from "@/server/http/errors";
import { route } from "@/server/http/handler";
import { upsertFacebookUser } from "@/server/services/auth";

const fail = (reason: string) => NextResponse.redirect(`${env.appUrl}/login?error=${reason}`);

export const GET = route({ auth: false, limit: "auth" }, async ({ req, ip }) => {
  if (!facebookEnabled) return fail("facebook_unavailable");
  const oauth = await completeOAuth("facebook", req);
  // The user pressed "Cancel" on Facebook's dialog, or the callback was forged.
  if (!oauth) return fail("facebook_failed");
  try {
    const profile = await exchangeCode(oauth.code);
    const { user } = await upsertFacebookUser(profile, oauth.ref);
    await createSession(user.id, { userAgent: req.headers.get("user-agent") ?? "", ip });
    return NextResponse.redirect(`${env.appUrl}${user.onboarded ? "/home" : "/onboarding"}`);
  } catch (err) {
    return fail(err instanceof HttpError && err.field === "email" ? "facebook_no_email" : "facebook_failed");
  }
});
