import { NextResponse } from "next/server";
import { authorizationUrl } from "@/server/auth/google";
import { beginOAuth } from "@/server/auth/oauth";
import { env, googleEnabled } from "@/server/env";
import { route } from "@/server/http/handler";

export const GET = route({ auth: false, limit: "auth" }, async ({ req }) => {
  if (!googleEnabled) return NextResponse.redirect(`${env.appUrl}/login?error=google_unavailable`);
  return NextResponse.redirect(authorizationUrl(await beginOAuth("google", req)));
});
