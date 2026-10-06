import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authorizationUrl } from "@/server/auth/google";
import { env, googleEnabled } from "@/server/env";
import { route } from "@/server/http/handler";

export const GET = route({ auth: false, limit: "auth" }, async () => {
  if (!googleEnabled) return NextResponse.redirect(`${env.appUrl}/login?error=google_unavailable`);
  const state = randomBytes(24).toString("base64url");
  (await cookies()).set("tv_oauth_state", state, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 600,
  });
  return NextResponse.redirect(authorizationUrl(state));
});
