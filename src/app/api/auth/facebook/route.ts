import { NextResponse } from "next/server";
import { authorizationUrl } from "@/server/auth/facebook";
import { beginOAuth } from "@/server/auth/oauth";
import { env, facebookEnabled } from "@/server/env";
import { route } from "@/server/http/handler";

export const GET = route({ auth: false, limit: "auth" }, async ({ req }) => {
  if (!facebookEnabled) return NextResponse.redirect(`${env.appUrl}/login?error=facebook_unavailable`);
  return NextResponse.redirect(authorizationUrl(await beginOAuth("facebook", req)));
});
